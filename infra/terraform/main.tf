# ---------------------------------------------------------------------
# main.tf — lookups and values shared by the other files
# ---------------------------------------------------------------------

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# The Learner Lab role. A `data` block, not a `resource`: the lab denies
# iam:CreateRole, so this configuration can only ever reuse what the lab
# already made. If this lookup fails with NoSuchEntity, the lab session
# has not been started, or the role is named something else in your
# course — check the IAM console and set lab_role_name.
data "aws_iam_role" "lab" {
  name = var.lab_role_name
}

# Amazon's ECS-optimised AMI, read from the public SSM parameter so the
# id is always current for the chosen region. Hard-coding an AMI id is
# the usual way this breaks six months later, and it is region-specific
# besides.
data "aws_ssm_parameter" "ecs_ami" {
  name = "/aws/service/ecs/optimized-ami/amazon-linux-2023/recommended/image_id"
}

locals {
  name = var.project_name

  azs = slice(data.aws_availability_zones.available.names, 0, var.az_count)

  # Three tiers per AZ, carved out of the VPC range. With the default
  # 10.0.0.0/16 and 2 AZs:
  #   public  10.0.0.0/24,  10.0.1.0/24    ALB, NAT
  #   app     10.0.10.0/24, 10.0.11.0/24   ECS tasks
  #   db      10.0.20.0/24, 10.0.21.0/24   RDS
  public_subnet_cidrs = [for i in range(var.az_count) : cidrsubnet(var.vpc_cidr, 8, i)]
  app_subnet_cidrs    = [for i in range(var.az_count) : cidrsubnet(var.vpc_cidr, 8, i + 10)]
  db_subnet_cidrs     = [for i in range(var.az_count) : cidrsubnet(var.vpc_cidr, 8, i + 20)]

  # Where the ECS instances live. Public (with public IPs) is the
  # no-NAT escape hatch; private is the real layout.
  ecs_subnet_ids = var.ecs_in_public_subnets ? aws_subnet.public[*].id : aws_subnet.app[*].id

  # The service is only created once there is an image to run.
  deploy_app = var.app_image != ""

  smtp_enabled = var.smtp_host != "" && var.smtp_user != "" && var.smtp_password != ""

  # How the deployed app sends mail. An explicit mail_transport wins;
  # otherwise SMTP when it is configured, and console when it is not.
  #
  # There is no SES option here any more — see README.md, "Why there is
  # no SES". In short: a Learner Lab account can never leave the SES
  # sandbox, so SES could only ever mail hand-verified addresses, which
  # a password reset cannot work with.
  mail_transport = (
    var.mail_transport != "" ? var.mail_transport :
    local.smtp_enabled ? "smtp" : "console"
  )

  # Gmail rewrites a From address that is not the authenticated account,
  # so smtp_user is the safe fallback rather than a made-up no-reply@.
  mail_from = (
    var.mail_from != "" ? var.mail_from :
    local.smtp_enabled ? "Tarot Diary <${var.smtp_user}>" : ""
  )
}
