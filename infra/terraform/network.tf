# ---------------------------------------------------------------------
# network.tf — VPC, subnets, and how packets get in and out
# ---------------------------------------------------------------------
# Three tiers, each repeated across the AZs:
#
#   public   ALB and NAT Gateways. Has a route to the Internet Gateway.
#   app      ECS tasks. No inbound route from the internet; outbound
#            goes through NAT (or directly, if ecs_in_public_subnets).
#   db       RDS only. No internet route at all, in either direction —
#            the database should be unreachable except from the app tier.
# ---------------------------------------------------------------------

resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr
  # Both are required for RDS to get a resolvable hostname, and for the
  # S3 gateway endpoint to work.
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "${local.name}-vpc" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${local.name}-igw" }
}

# ----- Subnets -----

resource "aws_subnet" "public" {
  count = var.az_count

  vpc_id                  = aws_vpc.main.id
  cidr_block              = local.public_subnet_cidrs[count.index]
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = true

  tags = { Name = "${local.name}-public-${local.azs[count.index]}" }
}

resource "aws_subnet" "app" {
  count = var.az_count

  vpc_id            = aws_vpc.main.id
  cidr_block        = local.app_subnet_cidrs[count.index]
  availability_zone = local.azs[count.index]

  tags = { Name = "${local.name}-app-${local.azs[count.index]}" }
}

resource "aws_subnet" "db" {
  count = var.az_count

  vpc_id            = aws_vpc.main.id
  cidr_block        = local.db_subnet_cidrs[count.index]
  availability_zone = local.azs[count.index]

  tags = { Name = "${local.name}-db-${local.azs[count.index]}" }
}

# ----- NAT -----
# count is nat_gateway_count, so this whole block disappears at 0.
# Each NAT needs its own Elastic IP.

resource "aws_eip" "nat" {
  count  = var.nat_gateway_count
  domain = "vpc"
  tags   = { Name = "${local.name}-nat-eip-${count.index}" }
}

resource "aws_nat_gateway" "main" {
  count = var.nat_gateway_count

  allocation_id = aws_eip.nat[count.index].id
  # A NAT Gateway lives in a PUBLIC subnet — it is the thing with the
  # internet route. Putting it in a private subnet is the classic
  # mistake and produces a VPC where nothing can reach anything.
  subnet_id = aws_subnet.public[count.index].id

  depends_on = [aws_internet_gateway.main]

  tags = { Name = "${local.name}-nat-${count.index}" }
}

# ----- Route tables -----

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${local.name}-rt-public" }
}

resource "aws_route" "public_internet" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.main.id
}

resource "aws_route_table_association" "public" {
  count = var.az_count

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# One route table per AZ, because each AZ may have its own NAT. With a
# single shared NAT every AZ points at the same one.
resource "aws_route_table" "app" {
  count = var.az_count

  vpc_id = aws_vpc.main.id
  tags   = { Name = "${local.name}-rt-app-${local.azs[count.index]}" }
}

resource "aws_route" "app_nat" {
  # No route at all when there is no NAT: tasks then reach the internet
  # through their own public IP, or not at all.
  count = var.nat_gateway_count > 0 ? var.az_count : 0

  route_table_id         = aws_route_table.app[count.index].id
  destination_cidr_block = "0.0.0.0/0"
  # min() so that with one NAT every AZ shares it, and with one per AZ
  # each uses its own.
  nat_gateway_id = aws_nat_gateway.main[min(count.index, var.nat_gateway_count - 1)].id
}

resource "aws_route_table_association" "app" {
  count = var.az_count

  subnet_id      = aws_subnet.app[count.index].id
  route_table_id = aws_route_table.app[count.index].id
}

# The database tier gets a route table with no internet route in it.
# This is deliberate and is the main thing protecting RDS.
resource "aws_route_table" "db" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${local.name}-rt-db" }
}

resource "aws_route_table_association" "db" {
  count = var.az_count

  subnet_id      = aws_subnet.db[count.index].id
  route_table_id = aws_route_table.db.id
}

# ----- VPC endpoints -----

# S3 through a gateway endpoint. This one is FREE — there is no hourly
# charge and no data charge — and it keeps S3 traffic off the NAT, where
# every gigabyte is billed. Worth having even on the tightest budget.
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${var.aws_region}.s3"
  vpc_endpoint_type = "Gateway"

  route_table_ids = concat(
    aws_route_table.app[*].id,
    [aws_route_table.db.id, aws_route_table.public.id],
  )

  tags = { Name = "${local.name}-vpce-s3" }
}
