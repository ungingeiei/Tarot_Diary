# ---------------------------------------------------------------------
# outputs.tf — what you need after an apply
# ---------------------------------------------------------------------

output "app_url" {
  description = "The site's address. HTTP only — there is no certificate; see README.md."
  value       = "http://${aws_lb.main.dns_name}"
}

output "ecr_repository_url" {
  description = "Push the image here, then set app_image to this plus ':latest'."
  value       = aws_ecr_repository.app.repository_url
}

output "docker_push_commands" {
  description = "Copy-paste build and push, already filled in for this account and region."
  value       = <<-EOT
    aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com
    docker build --platform linux/amd64 -t ${local.name} ../..
    docker tag ${local.name}:latest ${aws_ecr_repository.app.repository_url}:latest
    docker push ${aws_ecr_repository.app.repository_url}:latest
  EOT
}

output "db_endpoint" {
  description = "RDS address. Only reachable from inside the VPC, so you cannot connect from your laptop."
  value       = aws_db_instance.main.address
}

output "db_migration_hint" {
  description = "How to load the schema into a database that has no public route."
  value       = <<-EOT
    RDS is private, so Workbench on your laptop cannot reach it. Load the
    SQL files in public/database/ from inside the VPC — easiest is
    Session Manager onto one of the ECS instances:

      aws ssm start-session --target <instance-id> --region ${var.aws_region}
      sudo dnf install -y mariadb105
      mysql -h ${aws_db_instance.main.address} -u ${var.db_username} -p ${var.db_name}

    Run 00_ERD_V1_2.sql first, then the numbered files in order. Do not
    forget 09_password_reset_pin.sql, or every password reset fails with
    an unknown-column error.
  EOT
}

output "cloudwatch_log_group" {
  description = "Where the app's logs go — including the reset PIN when MAIL_TRANSPORT=console."
  value       = aws_cloudwatch_log_group.app.name
}

output "next_steps" {
  description = "What to do after this apply."
  value       = local.deploy_app ? "Deployed. Open app_url. Logs are in ${aws_cloudwatch_log_group.app.name}." : "Infrastructure is up but NO APP is running yet: app_image is empty. Run the commands in docker_push_commands, then set app_image = \"${aws_ecr_repository.app.repository_url}:latest\" and apply again."
}
