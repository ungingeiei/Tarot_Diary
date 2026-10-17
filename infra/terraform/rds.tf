# ---------------------------------------------------------------------
# rds.tf — the MySQL database
# ---------------------------------------------------------------------
# Replaces DB_HOST=localhost from local development. The app reaches it
# by the address in the ECS task definition; nothing else can, because
# it sits in the db subnets (no internet route) behind a security group
# that only admits the app tier.
# ---------------------------------------------------------------------

resource "aws_db_subnet_group" "main" {
  name       = "${local.name}-db-subnets"
  subnet_ids = aws_subnet.db[*].id

  tags = { Name = "${local.name}-db-subnets" }
}

resource "aws_db_instance" "main" {
  identifier = "${local.name}-db"

  engine = "mysql"
  # Major version only: AWS picks the current minor release, and
  # pinning a minor version means the apply fails the day AWS retires
  # it. The app uses nothing version-specific beyond MySQL 8.
  engine_version = "8.0"

  instance_class    = var.db_instance_class
  allocated_storage = 20 # GiB — the minimum, and the free-tier amount
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  # The single most important line in this file. True would put the
  # database on the public internet with only the security group in the
  # way; there is no reason for it, because the app reaches RDS from
  # inside the VPC.
  publicly_accessible = false

  multi_az = var.db_multi_az

  backup_retention_period = 1 # days; 0 disables backups entirely
  # Deleting a lab stack should actually delete it. In production both
  # of these should be the other way round — a final snapshot is the
  # thing that saves you from a mistaken destroy.
  skip_final_snapshot = true
  deletion_protection = false

  # Minor versions are applied in this window rather than whenever AWS
  # feels like it, so an upgrade cannot land mid-demo.
  auto_minor_version_upgrade   = true
  maintenance_window           = "Mon:04:00-Mon:05:00"
  backup_window                = "03:00-04:00"
  performance_insights_enabled = false # billable beyond 7 days' retention

  tags = { Name = "${local.name}-db" }
}
