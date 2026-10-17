# ---------------------------------------------------------------------
# versions.tf — provider versions and where state lives
# ---------------------------------------------------------------------
terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # State is kept in a local terraform.tfstate file on purpose.
  #
  # The usual advice is an S3 backend with a lock table, and for a real
  # deployment that is right. On AWS Academy Learner Lab it is a trap:
  # the lab's credentials expire every few hours and the whole ACCOUNT
  # is wiped between course terms, so a remote state bucket outlives
  # neither. A local state file is also the only one that survives the
  # lab being reset while your laptop does not.
  #
  # The cost of this choice: terraform.tfstate is a real file holding
  # the database password in clear text, and it is NOT in git (see
  # .gitignore in this directory). Back it up yourself; losing it means
  # Terraform no longer knows about the resources it created and you
  # delete them by hand.
  #
  # backend "s3" {
  #   bucket = "tarot-diary-tfstate"
  #   key    = "prod/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

provider "aws" {
  region = var.aws_region

  # Learner Lab credentials are temporary and come as three values
  # (key, secret, session token) from the lab's "AWS Details" panel.
  # Put them in ~/.aws/credentials or export them as AWS_ACCESS_KEY_ID /
  # AWS_SECRET_ACCESS_KEY / AWS_SESSION_TOKEN before running Terraform —
  # they are deliberately NOT variables here, so they cannot end up in
  # a .tfvars file that gets committed.
  #
  # They expire when the lab session ends. "ExpiredToken" in the middle
  # of an apply means exactly that: start the lab again, re-export, and
  # run apply once more. Terraform picks up where it stopped.

  default_tags {
    tags = {
      Project   = var.project_name
      ManagedBy = "terraform"
    }
  }
}
