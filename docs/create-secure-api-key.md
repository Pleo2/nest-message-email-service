# Opción 1: Node.js

node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Opción 2: OpenSSL

openssl rand -base64 32

# Opción 3: UUID

node -e "console.log(require('crypto').randomUUID())"

# Resultado ejemplo:

# 7XtKZ9y3vWp2qR8nM5jL4cH6bN1aS0dF3gT5uY7iO9k=
