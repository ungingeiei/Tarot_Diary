# Deploying Tarot Diary to AWS

Terraform for the architecture in the project diagram, adjusted for what
**AWS Academy Learner Lab** actually permits. Validated with
`tofu validate`; **never applied against a real account**, so treat the
first apply as a test, not a formality.

---

## What was cut from the diagram, and why

| In the diagram | Here | Why |
|---|---|---|
| CloudFront | ✂️ removed | Not available in Learner Lab. The ALB's DNS name is the site address. |
| AWS WAF | ✂️ removed | Not available in Learner Lab, and it attaches to CloudFront/ALB only. |
| Region `ap-southeast-1` | `us-east-1` | Learner Lab permits **only us-east-1 and us-west-2**. `variables.tf` enforces this. |
| 2 NAT Gateways | 1 (configurable) | ~$32/month **each**. Two would consume a $50 lab budget in weeks. |
| RDS Multi-AZ | single-AZ (configurable) | Doubles the database bill for availability nobody tests in a lab. |
| Amazon SES | ✂️ removed entirely | A lab account can never leave the SES sandbox. Mail goes out over SMTP instead — see below. |
| Separate IAM roles | the lab's `LabRole` | Learner Lab **denies `iam:CreateRole`**. See the caveat below. |
| HTTPS | **HTTP only** | A certificate needs a domain you control; Learner Lab cannot register one. |

Everything marked *configurable* is a variable — set it to the diagram's
value on a real account and the stack matches the drawing.

### Two of these are real security problems, not just simplifications

1. **HTTP only.** A reset PIN crossing the internet in clear text is
   precisely what TLS exists to prevent. Fine for a graded demo; not
   fine for real users.
2. **One IAM role for everything.** Normally the task execution role
   (pull image, write logs) and the task role (`ses:SendEmail`) are
   separate and minimal. Collapsing both into `LabRole` hands the
   application every permission the lab role holds. This is a lab
   restriction, not a recommendation.

Secrets are also passed as plain environment variables in the task
definition — see the note in `ecs.tf`.

---

## Before you start

- An active Learner Lab session (credentials expire every few hours)
- Docker, and OpenTofu or Terraform ≥ 1.6
- The AWS CLI

```bash
# From the lab's "AWS Details" → "AWS CLI" panel. All THREE values:
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_SESSION_TOKEN=...
```

> `ExpiredToken` partway through an apply just means the session ended.
> Start the lab again, re-export, and run `apply` once more — Terraform
> continues from where it stopped.

---

## Deploy

The first apply **cannot** include the app: ECR does not exist yet, so
there is nothing to push. Hence two passes.

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars: db_password, jwt_secret, the neon_s3_* values
```

**Pass 1 — infrastructure** (`app_image` stays empty)

```bash
tofu init
tofu apply
```

**Pass 2 — build, push, run**

```bash
tofu output -raw docker_push_commands   # prints them filled in
# run those four commands, then:
# set app_image = "<ecr_repository_url>:latest" in terraform.tfvars
tofu apply
tofu output app_url
```

> On an Apple Silicon Mac the `--platform linux/amd64` flag in the build
> command is not optional. Without it the task dies at startup with
> `exec format error`.

**Load the database schema.** RDS is private, so Workbench on your
laptop cannot reach it:

```bash
tofu output db_migration_hint
```

Run `public/database/00_ERD_V1_2.sql` first, then the numbered files in
order. **Do not skip `09_password_reset_pin.sql`** — without it every
password reset fails on an unknown column.

**Tear down** (do this when you stop working; NAT and RDS bill by the
hour):

```bash
tofu destroy
```

---

## Email

`src/lib/mailer.js` picks how to send from `MAIL_TRANSPORT`:

| Value | Sends via | Use when |
|---|---|---|
| `smtp` | any SMTP server, via nodemailer | **normal** |
| `console` | nothing — prints the PIN to the log | demo; read it in CloudWatch |

Fill in the SMTP block in `terraform.tfvars` — the same values as your
local `.env`, so the deployed app behaves exactly as it does on your
laptop:

```hcl
mail_transport = "smtp"
smtp_host      = "smtp.gmail.com"
smtp_port      = 465
smtp_user      = "you@gmail.com"
smtp_password  = "your 16-char App password"   # NOT the account password
mail_from      = "Tarot Diary <you@gmail.com>"
```

Three things that will bite:

- **It needs a route to the internet.** With `nat_gateway_count = 0` you
  must also set `ecs_in_public_subnets = true`, or nothing sends (and
  the image cannot be pulled either).
- **Gmail allows roughly 500 messages a day** on a free account. Fine
  for a lab, not for a real site.
- **Gmail rewrites the From address** if it is not the authenticated
  account. The display name in front is free; the address must be
  `smtp_user`, or an alias verified under Gmail's "Send mail as".

Port 465 and 587 outbound from the tasks both work — AWS blocks only
port 25.

### Why there is no SES

The architecture diagram had SES, and an earlier version of this stack
created it. It was removed, because on AWS Academy Learner Lab it cannot
work — not through any fault of configuration:

1. Every SES account starts in the **sandbox**: mail only to addresses
   you verified by hand, 200 a day.
2. Leaving the sandbox requires an AWS **Support case**.
3. **Learner Lab accounts cannot open Support cases.**

A password reset is sent to whoever asks for it, so a permanently
sandboxed SES cannot deliver the one feature it was added for. Carrying
~100 lines of configuration that can only ever half-work is worse than
not having it: someone sets `ses_sender_identity`, the apply succeeds,
and the failure only shows up as unreceived mail.

Separately, and true even on a real account: **you cannot send from
`@gmail.com` through SES** and expect delivery. SES will verify a single
gmail.com address, but gmail.com's DMARC policy makes receivers reject
or spam-file mail SES signs on its behalf. SES needs a domain you own.

**To add SES back** on a real AWS account, see "Moving off Learner Lab"
below. `src/lib/mailer.js` still has a working `ses` transport, so it is
an infrastructure change only — no application code.

## Moving off Learner Lab

Changes, in order of importance:

1. **Create real IAM roles.** Replace the `data "aws_iam_role" "lab"`
   lookup in `main.tf` with three `aws_iam_role` resources: EC2 instance
   (`AmazonEC2ContainerServiceforEC2Role`), task execution
   (`AmazonECSTaskExecutionRolePolicy`), and a task role whose only
   permission is `ses:SendEmail`.
2. **Move the secrets.** Put `db_password`, `jwt_secret` and the Neon
   keys in Secrets Manager and reference them from the task definition's
   `secrets` block instead of `environment`.
3. **Add HTTPS.** ACM certificate + a 443 listener, and redirect 80.
4. **Add SES back**, if you want to stop depending on Gmail. The app
   side already exists — set `MAIL_TRANSPORT=ses` and `SES_REGION` on
   the task, give the task role `ses:SendEmail`, and create an
   `aws_sesv2_email_identity` for a domain you own plus an
   `aws_sesv2_configuration_set` with `suppressed_reasons = ["BOUNCE",
   "COMPLAINT"]`. Add the DKIM CNAMEs to DNS, then request production
   access in the SES console (about 24 hours).

   Bounce handling matters more here than usual: register only checks
   that the address's **domain** accepts mail (an MX lookup in
   `lib/validators/email.js`), never that the mailbox exists — so a
   signup as `asdfgh@gmail.com` hard-bounces, and SES suspends accounts
   whose bounce rate passes 5%.
5. **Turn the diagram back on**: `nat_gateway_count = 2`,
   `db_multi_az = true`, and add CloudFront + WAF in front of the ALB.
6. **Remote state.** Uncomment the S3 backend in `versions.tf`.
7. **Fix the rate limiter** — see below.

---

## Known issue this stack exposes

`src/lib/rateLimit.js` keeps its counters **in process memory**. With
`app_count = 2` behind an ALB there are two independent counters, so the
real limit is double what the code says, and a deployment resets both.
This guards `/api/auth/forgot-password` and the PIN attempts, so it is
the brute-force protection that quietly weakens on deploy.

The file says so itself ("fine for a school project / one server"). The
fix is a shared store — a small MySQL table is enough and needs no new
service. Worth doing before anyone relies on this.
