# ---------------------------------------------------------------------
# alb.tf — the public entry point
# ---------------------------------------------------------------------
# In the diagram CloudFront sat in front of this with WAF attached.
# Neither is created here: see README.md, "What was cut and why". The
# ALB's own DNS name is therefore the site's address.
# ---------------------------------------------------------------------

resource "aws_lb" "main" {
  name               = "${local.name}-alb"
  load_balancer_type = "application"
  internal           = false
  security_groups    = [aws_security_group.alb.id]
  # An ALB must sit in at least two AZs, which is why az_count cannot
  # sensibly be 1.
  subnets = aws_subnet.public[*].id

  # Off so that `terraform destroy` really destroys it. On a real
  # deployment turn this on; in a lab it only strands resources that
  # keep costing money.
  enable_deletion_protection = false

  tags = { Name = "${local.name}-alb" }
}

resource "aws_lb_target_group" "app" {
  name     = "${local.name}-tg"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id
  # "ip", not "instance": the tasks use awsvpc networking, so each one
  # has its own ENI and address rather than a port on the host.
  target_type = "ip"

  health_check {
    enabled = true
    # "/" is used because the app has no dedicated health endpoint. It
    # works, but it renders a full page on every check. Adding a cheap
    # /api/health route and pointing this at it is a small, worthwhile
    # follow-up.
    path                = "/"
    matcher             = "200-399"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  # Give a task time to finish in-flight requests before it is killed
  # during a deployment.
  deregistration_delay = 30

  tags = { Name = "${local.name}-tg" }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}
