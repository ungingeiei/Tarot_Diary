/**
 * ---------------------------------------------------------------------
 * scripts/mirror-storage.mjs — copy card images from Neon into AWS S3
 * ---------------------------------------------------------------------
 * Run ONCE, when moving storage from the Neon object store to real S3
 * (see infra/terraform/s3.tf). The new bucket starts empty, so until
 * this has run every card uploaded before the move shows a broken
 * image: the database still points at /api/images/cards/<key>, and the
 * object behind that key is only in Neon.
 *
 *   node --env-file=.env scripts/mirror-storage.mjs <destination-bucket>
 *
 * The bucket name comes from Terraform:
 *   cd infra/terraform && tofu output -raw images_bucket
 *
 * SOURCE (Neon)        read from .env: AWS_ENDPOINT_URL_S3,
 *                      AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
 *                      S3_BUCKET
 * DESTINATION (AWS)    the bucket named on the command line, in
 *                      DEST_REGION (default us-east-1), using the AWS
 *                      credentials from DEST_* if given, otherwise the
 *                      normal chain — which locally means the lab
 *                      credentials file:
 *
 *   export AWS_SHARED_CREDENTIALS_FILE=infra/terraform/credentials
 *
 * Note the two sides deliberately use DIFFERENT variables. The AWS_*
 * names in .env belong to NEON, not to AWS, which is the confusion this
 * whole move exists to end — mixing them here would copy the bucket
 * onto itself.
 *
 * SAFE TO RE-RUN. An object already in the destination with the same
 * size is skipped, so a second run copies only what is missing and an
 * interrupted run can simply be started again.
 *
 * Nothing is deleted from Neon. Check the site works, then clean up by
 * hand.
 * ---------------------------------------------------------------------
 */

import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

const destBucket = process.argv[2];
if (!destBucket) {
  console.error("Usage: node --env-file=.env scripts/mirror-storage.mjs <destination-bucket>");
  console.error("Get the name with: cd infra/terraform && tofu output -raw images_bucket");
  process.exit(1);
}

const sourceBucket = process.env.S3_BUCKET || "cloudnarok";
const sourceEndpoint = process.env.AWS_ENDPOINT_URL_S3;
if (!sourceEndpoint) {
  console.error("AWS_ENDPOINT_URL_S3 is not set — there is no Neon store to copy FROM.");
  process.exit(1);
}

// Everything the SOURCE needs, captured BEFORE the cleanup below.
const sourceRegion = process.env.AWS_REGION || "us-east-2";
const sourceKeyId = process.env.AWS_ACCESS_KEY_ID;
const sourceSecret = process.env.AWS_SECRET_ACCESS_KEY;

// ----- source: Neon, always with explicit keys -----
const source = new S3Client({
  region: sourceRegion,
  endpoint: sourceEndpoint,
  forcePathStyle: true,
  credentials: { accessKeyId: sourceKeyId, secretAccessKey: sourceSecret },
});

// --- THE CLEANUP THAT MAKES THE DESTINATION WORK ---------------------
// The AWS SDK reads AWS_ENDPOINT_URL_S3 from the environment on its
// own. Creating the destination client without an endpoint is therefore
// NOT enough: it silently inherits Neon's, and every upload goes to
//   <aws-bucket-name>.<neon-host>
// which fails on the TLS certificate — the symptom is
//   "Hostname/IP does not match certificate's altnames"
// and it looks like a Neon problem when it is really this one.
//
// The values are already captured above, so removing them here affects
// only what the SDK infers for the destination. The static keys go too:
// they are Neon's, and with AWS_PROFILE also set the SDK warns about
// having two credential sources. The destination should use the profile
// (the lab credentials file) alone.
for (const name of [
  "AWS_ENDPOINT_URL_S3",
  "AWS_ENDPOINT_URL",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
]) {
  delete process.env[name];
}

// ----- destination: real AWS S3 -----
const dest = new S3Client({
  region: process.env.DEST_REGION || "us-east-1",
  ...(process.env.DEST_ACCESS_KEY_ID
    ? {
        credentials: {
          accessKeyId: process.env.DEST_ACCESS_KEY_ID,
          secretAccessKey: process.env.DEST_SECRET_ACCESS_KEY,
          // Lab credentials are temporary and useless without this.
          ...(process.env.DEST_SESSION_TOKEN
            ? { sessionToken: process.env.DEST_SESSION_TOKEN }
            : {}),
        },
      }
    : {}),
});

/** Read a stream fully. The objects are images of a few MB, so this is fine. */
async function toBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

/** Is this key already in the destination at the same size? */
async function alreadyThere(key, size) {
  try {
    const head = await dest.send(new HeadObjectCommand({ Bucket: destBucket, Key: key }));
    return head.ContentLength === size;
  } catch {
    // NotFound, or no permission to head — either way, try the copy and
    // let that produce the real error.
    return false;
  }
}

async function main() {
  console.log(`From: ${sourceBucket} at ${sourceEndpoint}`);
  console.log(`To:   ${destBucket} (AWS S3, ${process.env.DEST_REGION || "us-east-1"})\n`);

  let token;
  let copied = 0;
  let skipped = 0;
  let failed = 0;
  let bytes = 0;

  do {
    const page = await source.send(
      new ListObjectsV2Command({ Bucket: sourceBucket, ContinuationToken: token })
    );

    for (const object of page.Contents || []) {
      const { Key: key, Size: size } = object;
      // A "directory" placeholder has nothing to copy.
      if (key.endsWith("/")) continue;

      if (await alreadyThere(key, size)) {
        console.log(`  skip  ${key}`);
        skipped++;
        continue;
      }

      try {
        const got = await source.send(
          new GetObjectCommand({ Bucket: sourceBucket, Key: key })
        );
        const body = await toBuffer(got.Body);

        await dest.send(
          new PutObjectCommand({
            Bucket: destBucket,
            Key: key,
            Body: body,
            // Carried over so /api/images serves the right type; without
            // it S3 would hand back application/octet-stream and the
            // browser would download the image instead of showing it.
            ContentType: got.ContentType || "application/octet-stream",
          })
        );

        console.log(`  copy  ${key}  (${(size / 1024).toFixed(0)} KB)`);
        copied++;
        bytes += size;
      } catch (error) {
        // Keep going: one unreadable object should not stop the other
        // fifty-five. The count at the end is what decides success.
        console.error(`  FAIL  ${key}: ${error.message}`);
        failed++;
      }
    }

    token = page.NextContinuationToken;
  } while (token);

  console.log(
    `\ncopied ${copied}, skipped ${skipped}, failed ${failed}` +
      ` — ${(bytes / 1024 / 1024).toFixed(2)} MB transferred`
  );
  if (failed > 0) {
    console.error("\nSome objects did not copy. Re-run to retry just those.");
    process.exit(1);
  }
  console.log("Nothing was deleted from Neon. Check the site, then clean up by hand.");
}

main().catch((error) => {
  console.error("Mirror failed:", error.message);
  process.exit(1);
});
