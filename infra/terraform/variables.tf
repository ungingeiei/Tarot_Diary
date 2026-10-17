# ---------------------------------------------------------------------
# variables.tf — everything you are expected to change
# ---------------------------------------------------------------------
# The defaults are tuned for AWS Academy Learner Lab: the cheapest thing
# that still works, because the lab budget is around $50 and a NAT
# Gateway alone can eat most of it. Every default that was chosen for
# cost rather than correctness says so.
# ---------------------------------------------------------------------

variable "project_name" {
  description = "Name prefix for every resource, so they are easy to find and delete."
  type        = string
  default     = "tarot-diary"
}

variable "aws_region" {
  description = <<-EOT
    Region to deploy into.

    Learner Lab only permits us-east-1 and us-west-2. The architecture
    diagram says ap-southeast-1, which the lab will refuse — that is why
    the default here is us-east-1 and not the diagram's region.
  EOT
  type        = string
  default     = "us-east-1"

  validation {
    condition     = contains(["us-east-1", "us-west-2"], var.aws_region)
    error_message = "Learner Lab only allows us-east-1 and us-west-2. Remove this validation if you are deploying to a normal AWS account."
  }
}

# ----- Network -----

variable "vpc_cidr" {
  description = "Address range for the VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "az_count" {
  description = "How many Availability Zones to spread across. Two is the minimum an ALB accepts."
  type        = number
  default     = 2
}

variable "nat_gateway_count" {
  description = <<-EOT
    How many NAT Gateways to create (0, 1, or one per AZ).

    COST WARNING, and the single most expensive decision in this file.
    A NAT Gateway is roughly $0.045/hour — about $32 a month EACH, before
    data charges. The diagram shows two (one per AZ, for availability);
    on a $50 lab budget two of them is the whole budget in six weeks.

      1 (default) - one shared NAT. If its AZ fails, tasks in the other
                    AZ lose outbound internet. Fine for a lab.
      2           - what the diagram shows. Correct for production.
      0           - no NAT at all. Tasks then CANNOT reach the internet,
                    so ECR image pulls and outgoing mail fail unless you set
                    ecs_in_public_subnets = true, or add interface
                    endpoints. Cheapest, but read that variable first.
  EOT
  type        = number
  default     = 1

  validation {
    condition     = var.nat_gateway_count >= 0 && var.nat_gateway_count <= var.az_count
    error_message = "nat_gateway_count must be between 0 and az_count."
  }
}

variable "ecs_in_public_subnets" {
  description = <<-EOT
    Put the ECS instances in the PUBLIC subnets, where they get public
    IPs, instead of in private subnets behind a NAT Gateway.

    (This is NOT the ECS service's own `assign_public_ip` field, which
    only applies to Fargate and must stay false on EC2. This moves the
    INSTANCES; the tasks follow them.)

    This saves the entire NAT cost, which on a lab budget is the
    difference between finishing the term and running out. The price is
    real, though: the instances are then directly addressable from the
    internet and only their security group stands in the way. Acceptable
    for coursework, not for anything holding other people's data.

    Set this true together with nat_gateway_count = 0.
  EOT
  type        = bool
  default     = false
}

# ----- Compute -----

variable "instance_type" {
  description = <<-EOT
    EC2 type for the ECS container instances.

    Learner Lab refuses anything larger than a few small types; t3.micro
    and t3.small are safe. t3.micro has 1 GB of RAM, which a Next.js
    server fits in but does not enjoy — t3.small is the better default.
  EOT
  type        = string
  default     = "t3.small"
}

variable "ecs_instance_count" {
  description = "How many EC2 instances in the ECS cluster. Two lets a deployment replace one task at a time."
  type        = number
  default     = 2
}

variable "app_count" {
  description = "How many copies of the app to run."
  type        = number
  default     = 2
}

variable "app_image" {
  description = <<-EOT
    Full image URI for the app, e.g.
      123456789012.dkr.ecr.us-east-1.amazonaws.com/tarot-diary:latest

    Leave empty on the FIRST apply: the ECR repository does not exist
    yet, so there is nothing to push to. Apply once with this empty
    (the ECS service is skipped), push the image, then set it and apply
    again. The README spells out the order.
  EOT
  type        = string
  default     = ""
}

variable "app_cpu" {
  description = "CPU units reserved per task (1024 = 1 vCPU)."
  type        = number
  default     = 512
}

variable "app_memory" {
  description = "MiB of memory per task. Must fit inside the instance type above."
  type        = number
  default     = 768
}

# ----- Database -----

variable "db_name" {
  description = "Schema name created inside RDS."
  type        = string
  default     = "cloudnarok"
}

variable "db_username" {
  description = "RDS master username. 'admin' is reserved by MySQL in RDS, so do not use it."
  type        = string
  default     = "tarotadmin"
}

variable "db_password" {
  description = <<-EOT
    RDS master password. Minimum 8 characters; / @ " and spaces are not
    allowed by RDS.

    This ends up in terraform.tfstate in clear text, which is why that
    file is gitignored. In a normal AWS account this would come from
    Secrets Manager instead — Learner Lab's access to Secrets Manager is
    inconsistent, so it is a variable here.
  EOT
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS size. db.t3.micro is the smallest MySQL 8 supports and what the lab budget wants."
  type        = string
  default     = "db.t3.micro"
}

variable "db_multi_az" {
  description = <<-EOT
    Run a synchronous standby in the second AZ (what the diagram shows).

    It doubles the database bill for availability nobody is testing in a
    lab, so the default is off. Turn it on for a real deployment.
  EOT
  type        = bool
  default     = false
}

# ----- Mail -----

# ----- Learner Lab -----

variable "lab_role_name" {
  description = <<-EOT
    The pre-made IAM role every Learner Lab account has.

    Learner Lab DENIES iam:CreateRole, so this configuration never
    creates a role — it reuses this one for the ECS task role, the task
    execution role and the EC2 instance profile. That is unusual (those
    would normally be three separate least-privilege roles) and it is a
    restriction of the lab, not a recommendation.

    In a normal AWS account, replace this data lookup in main.tf with
    three aws_iam_role resources — see README.md, "Moving off Learner
    Lab".
  EOT
  type        = string
  default     = "LabRole"
}

variable "lab_instance_profile_name" {
  description = "The matching instance profile Learner Lab provides for EC2."
  type        = string
  default     = "LabInstanceProfile"
}

# ----- Application secrets -----

variable "jwt_secret" {
  description = <<-EOT
    Secret that signs the login cookie (read by src/lib/session.js).

    Use a long random value, e.g. `openssl rand -hex 32`. Changing it
    signs every user out at once. Do NOT reuse the local development
    value in a deployed environment.
  EOT
  type        = string
  sensitive   = true
}

variable "neon_s3_endpoint" {
  description = <<-EOT
    Neon object-store endpoint for card images, the value of
    AWS_ENDPOINT_URL_S3 in .env, e.g.
      https://<project>.storage.<region>.aws.neon.tech

    This is Neon, not AWS S3 — see lib/storage.js. It is passed through
    unchanged so the deployed app serves the same images.
  EOT
  type        = string
  default     = ""
}

variable "neon_s3_access_key_id" {
  description = "Neon object-store key (starts with nak_, NOT an AWS AKIA key)."
  type        = string
  default     = ""
  sensitive   = true
}

variable "neon_s3_secret_access_key" {
  description = "Neon object-store secret."
  type        = string
  default     = ""
  sensitive   = true
}

variable "neon_s3_region" {
  description = "Region string the Neon endpoint expects."
  type        = string
  default     = "us-east-2"
}

# ----- Mail transport for the deployed app -----
# How the reset PIN gets delivered. SMTP is the only real option here:
# this stack creates no SES resources at all, for the reasons in
# README.md, "Why there is no SES".

variable "mail_transport" {
  description = <<-EOT
    How the deployed app sends the password-reset PIN.

      smtp     an outside SMTP server — Gmail with an App password, or
               Brevo/Mailgun. The working option, and the default once
               smtp_host is set.
      console  do not send; print the PIN into the CloudWatch log.
               Fine for a demo, useless for real users.
      ""       (default) pick automatically: smtp when smtp_host is
               set, otherwise console.
  EOT
  type        = string
  default     = ""

  validation {
    condition     = contains(["", "smtp", "console"], var.mail_transport)
    error_message = "mail_transport must be \"smtp\", \"console\", or empty to auto-detect. This stack has no SES resources; see README.md."
  }
}

variable "smtp_host" {
  description = "SMTP server, e.g. smtp.gmail.com. Empty means no SMTP."
  type        = string
  default     = ""
}

variable "smtp_port" {
  description = "465 for implicit TLS, 587 for STARTTLS. AWS blocks outbound port 25, but not these two."
  type        = number
  default     = 465
}

variable "smtp_user" {
  description = "The sending account, e.g. nothingtosayz09@gmail.com. Must match the account the App password came from."
  type        = string
  default     = ""
}

variable "smtp_password" {
  description = <<-EOT
    SMTP password. For Gmail this is a 16-character App password, not
    the account password — Google rejects the account password outright
    with "534 Application-specific password required".

    Lands in terraform.tfstate and in the task definition in clear text;
    see the note in ecs.tf.
  EOT
  type        = string
  default     = ""
  sensitive   = true
}

variable "mail_from" {
  description = <<-EOT
    The From header, e.g. "Tarot Diary <nothingtosayz09@gmail.com>".

    With Gmail the ADDRESS must be smtp_user (or an alias verified under
    "Send mail as"), or Gmail silently rewrites it. The display name in
    front is free. Empty falls back to smtp_user.
  EOT
  type        = string
  default     = ""
}
