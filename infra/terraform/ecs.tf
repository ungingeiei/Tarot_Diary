# ---------------------------------------------------------------------
# ecs.tf — the cluster, the EC2 instances behind it, and the app itself
# ---------------------------------------------------------------------
# ECS on EC2 rather than Fargate, because that is what the diagram shows
# and because Learner Lab's Fargate access is inconsistent between
# courses. The trade-off is that the instances are yours to size and pay
# for whether or not anything is running on them.
# ---------------------------------------------------------------------

resource "aws_ecs_cluster" "main" {
  name = "${local.name}-cluster"

  setting {
    name  = "containerInsights"
    value = "disabled" # Insights bills per metric; off for the lab budget.
  }
}

# ----- The EC2 instances that host the containers -----

resource "aws_launch_template" "ecs" {
  name_prefix   = "${local.name}-ecs-"
  image_id      = data.aws_ssm_parameter.ecs_ami.value
  instance_type = var.instance_type

  # The LAB's instance profile. Creating one of our own would need
  # iam:CreateRole, which the lab denies.
  iam_instance_profile {
    name = var.lab_instance_profile_name
  }

  vpc_security_group_ids = [aws_security_group.ecs.id]

  # This is the whole reason an instance joins the cluster: the ECS
  # agent reads /etc/ecs/ecs.config at boot. Without it the instances
  # come up healthy and the cluster stays empty, which is a confusing
  # way to spend an afternoon.
  user_data = base64encode(<<-EOT
    #!/bin/bash
    echo "ECS_CLUSTER=${aws_ecs_cluster.main.name}" >> /etc/ecs/ecs.config
    echo "ECS_ENABLE_CONTAINER_METADATA=true" >> /etc/ecs/ecs.config
  EOT
  )

  metadata_options {
    # IMDSv2 only. v1 lets anything that can make an HTTP request from
    # the instance — including a server-side request forgery bug in the
    # app — read the instance's credentials.
    http_tokens                 = "required"
    http_endpoint               = "enabled"
    http_put_response_hop_limit = 2 # 2, so a container can still reach it
  }

  tag_specifications {
    resource_type = "instance"
    tags          = { Name = "${local.name}-ecs-instance" }
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_autoscaling_group" "ecs" {
  name                = "${local.name}-asg"
  vpc_zone_identifier = local.ecs_subnet_ids
  min_size            = var.ecs_instance_count
  max_size            = var.ecs_instance_count + 1
  desired_capacity    = var.ecs_instance_count

  launch_template {
    id      = aws_launch_template.ecs.id
    version = "$Latest"
  }

  health_check_type         = "EC2"
  health_check_grace_period = 300

  tag {
    key                 = "Name"
    value               = "${local.name}-ecs-instance"
    propagate_at_launch = true
  }

  # Required by the ECS capacity provider below.
  tag {
    key                 = "AmazonECSManaged"
    value               = ""
    propagate_at_launch = true
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_ecs_capacity_provider" "main" {
  name = "${local.name}-cp"

  auto_scaling_group_provider {
    auto_scaling_group_arn = aws_autoscaling_group.ecs.arn

    managed_scaling {
      status          = "ENABLED"
      target_capacity = 100
    }

    # Left DISABLED on purpose. Managed termination protection requires
    # the ASG to have instance scale-in protection switched on, and when
    # the two disagree the capacity provider cannot be created at all —
    # with an error that does not mention either setting.
    managed_termination_protection = "DISABLED"
  }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = [aws_ecs_capacity_provider.main.name]

  default_capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.main.name
    weight            = 1
    base              = 1
  }
}

# ----- Logs -----

resource "aws_cloudwatch_log_group" "app" {
  name = "/ecs/${local.name}"
  # Logs cost money to keep. A week is enough to debug a deployment and
  # cheap enough not to notice.
  retention_in_days = 7

  tags = { Name = "${local.name}-logs" }
}

# ----- The app -----

resource "aws_ecs_task_definition" "app" {
  count = local.deploy_app ? 1 : 0

  family                   = local.name
  network_mode             = "awsvpc" # per-task ENI, so the task has its own security group
  requires_compatibilities = ["EC2"]
  cpu                      = tostring(var.app_cpu)
  memory                   = tostring(var.app_memory)

  # Both roles are the lab's single role. In a normal account these
  # would be two different roles: the EXECUTION role only needs to pull
  # the image and write logs, while the TASK role is what the running
  # code may do. Collapsing them hands the
  # application every permission the lab role has, which is far more
  # than it needs — a restriction of Learner Lab, not a design choice.
  execution_role_arn = data.aws_iam_role.lab.arn
  task_role_arn      = data.aws_iam_role.lab.arn

  container_definitions = jsonencode([
    {
      name      = "app"
      image     = var.app_image
      essential = true

      portMappings = [{
        containerPort = 3000
        protocol      = "tcp"
      }]

      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "PORT", value = "3000" },

        # ---- Database (RDS) ----
        { name = "DB_HOST", value = aws_db_instance.main.address },
        { name = "DB_PORT", value = tostring(aws_db_instance.main.port) },
        { name = "DB_USER", value = var.db_username },
        { name = "DB_NAME", value = var.db_name },
        { name = "DB_PASSWORD", value = var.db_password },

        # ---- Session cookie (lib/session.js) ----
        { name = "JWT_SECRET", value = var.jwt_secret },

        # ---- Card images: Neon's S3-compatible object store ----
        # NOT AWS S3, despite the names — lib/storage.js talks to Neon.
        # These are passed straight through so the deployed app reaches
        # the same bucket the local one does. They are also exactly the
        # variables that must never be mistaken for AWS credentials;
        # that is why SES uses SES_* instead (see lib/mailer.js).
        { name = "AWS_ENDPOINT_URL_S3", value = var.neon_s3_endpoint },
        { name = "AWS_ACCESS_KEY_ID", value = var.neon_s3_access_key_id },
        { name = "AWS_SECRET_ACCESS_KEY", value = var.neon_s3_secret_access_key },
        { name = "AWS_REGION", value = var.neon_s3_region },

        # ---- Mail ----
        # lib/mailer.js reads MAIL_TRANSPORT. local.mail_transport works
        # out which one (see main.tf): SMTP when it is configured,
        # console otherwise. SES is not an option in this stack — see
        # README.md, "Why there is no SES".
        { name = "MAIL_TRANSPORT", value = local.mail_transport },
        { name = "MAIL_FROM", value = local.mail_from },

        # SMTP — used when MAIL_TRANSPORT is "smtp". For Gmail the
        # password is a 16-character App password. Outbound 465/587 from
        # the tasks works; AWS only blocks port 25. It does need a route
        # out, so with nat_gateway_count = 0 set ecs_in_public_subnets.
        { name = "SMTP_HOST", value = var.smtp_host },
        { name = "SMTP_PORT", value = tostring(var.smtp_port) },
        { name = "SMTP_USER", value = var.smtp_user },
        { name = "SMTP_PASSWORD", value = var.smtp_password },
      ]

      # NOTE ON THE SECRETS ABOVE — DB_PASSWORD, JWT_SECRET, SMTP_PASSWORD
      # and the two Neon keys are plain environment variables, which is NOT how
      # this should be done. They are then readable by anyone who can
      # call ecs:DescribeTaskDefinition, and they sit in
      # terraform.tfstate as well. The right answer is a `secrets` block
      # pointing at Secrets Manager or SSM Parameter Store, so only an
      # ARN appears here and the value is fetched at task start.
      # Learner Lab's access to those two services varies by course,
      # so this stays simple and says plainly that it is wrong rather
      # than hiding it. Fix it in a real account.

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "app"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "app" {
  count = local.deploy_app ? 1 : 0

  name            = local.name
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app[0].arn
  desired_count   = var.app_count

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.main.name
    weight            = 1
    base              = 0
  }

  network_configuration {
    subnets         = local.ecs_subnet_ids
    security_groups = [aws_security_group.ecs.id]
    # Only when there is no NAT to go out through. With awsvpc on EC2
    # this follows the instances' own placement.
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = 3000
  }

  # Long enough for Next.js to start before the ALB decides the task is
  # unhealthy and kills it — a restart loop that looks like a crash.
  health_check_grace_period_seconds = 120

  depends_on = [aws_lb_listener.http]
}
