# ---------------------------------------------------------------------
# security_groups.tf — who may talk to whom
# ---------------------------------------------------------------------
# The rules reference each OTHER's security group rather than CIDR
# ranges wherever possible. That way "only the app may reach the
# database" stays true no matter how the subnets are renumbered, and
# an instance that is not in the app's group cannot reach RDS even from
# inside the same subnet.
# ---------------------------------------------------------------------

# ----- ALB: open to the world on HTTP -----
resource "aws_security_group" "alb" {
  name        = "${local.name}-alb"
  description = "Public entry point"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${local.name}-sg-alb" }
}

resource "aws_vpc_security_group_ingress_rule" "alb_http" {
  security_group_id = aws_security_group.alb.id
  description       = "HTTP from anywhere"
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"
}

# HTTPS is deliberately NOT opened. Terminating TLS needs a certificate
# for a domain you control, and Learner Lab cannot register one or open
# the support case ACM sometimes needs. The diagram's CloudFront would
# normally have carried TLS; without it this stack is HTTP-only, which
# is acceptable for coursework and NOT acceptable for real users — a
# password reset PIN crossing the internet in clear text is exactly the
# thing TLS exists to stop. See README.md, "What was cut".

resource "aws_vpc_security_group_egress_rule" "alb_all" {
  security_group_id = aws_security_group.alb.id
  description       = "ALB to targets"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

# ----- ECS tasks: reachable only from the ALB -----
resource "aws_security_group" "ecs" {
  name        = "${local.name}-ecs"
  description = "App containers"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${local.name}-sg-ecs" }
}

resource "aws_vpc_security_group_ingress_rule" "ecs_from_alb" {
  security_group_id = aws_security_group.ecs.id
  description       = "App port, from the load balancer only"
  # The source is the ALB's security group, not a CIDR. Nothing else in
  # the VPC can reach the app, even on the same subnet.
  referenced_security_group_id = aws_security_group.alb.id
  from_port                    = 3000
  to_port                      = 3000
  ip_protocol                  = "tcp"
}

resource "aws_vpc_security_group_egress_rule" "ecs_all" {
  security_group_id = aws_security_group.ecs.id
  # Outbound stays open: the task pulls its image from ECR, reaches the
  # SMTP server, and queries RDS. Narrowing this to endpoint prefix lists is a real
  # hardening step, but it breaks image pulls in ways that are tedious
  # to debug in a lab.
  description = "Outbound to ECR, SMTP, RDS"
  cidr_ipv4   = "0.0.0.0/0"
  ip_protocol = "-1"
}

# ----- RDS: reachable only from the app -----
resource "aws_security_group" "rds" {
  name        = "${local.name}-rds"
  description = "MySQL"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${local.name}-sg-rds" }
}

resource "aws_vpc_security_group_ingress_rule" "rds_from_ecs" {
  security_group_id            = aws_security_group.rds.id
  description                  = "MySQL from the app tier only"
  referenced_security_group_id = aws_security_group.ecs.id
  from_port                    = 3306
  to_port                      = 3306
  ip_protocol                  = "tcp"
}

# No egress rule for RDS. A database has no business starting outbound
# connections, and leaving the group with no egress rules means it has
# none (an empty security group denies everything).
