# ---------------------------------------------------------------------
# ecr.tf — where the container image lives
# ---------------------------------------------------------------------
# ECS pulls the app image from here. The repository has to exist before
# there is anything to push, which is why the first apply runs with
# app_image empty and the ECS service is skipped — see README.md.
# ---------------------------------------------------------------------

resource "aws_ecr_repository" "app" {
  name = local.name

  image_scanning_configuration {
    scan_on_push = true
  }

  # MUTABLE so that pushing :latest again actually replaces it, which is
  # what the README's deploy loop does. IMMUTABLE is the better habit
  # for production (every deploy gets its own tag, and you can always
  # tell which code is running), but it makes :latest fail on the second
  # push and that is a surprise in the middle of a lab.
  image_tag_mutability = "MUTABLE"

  # Lets `terraform destroy` remove the repository even with images in
  # it. Without this the destroy fails and the repository is left behind
  # quietly costing storage.
  force_delete = true

  tags = { Name = "${local.name}-ecr" }
}

# Keep only the last few images. ECR storage is billed per GB and a
# Next.js image is a few hundred MB, so an unpruned repository is a slow
# budget leak in an account that only has $50.
resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep the 5 most recent images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 5
      }
      action = { type = "expire" }
    }]
  })
}
