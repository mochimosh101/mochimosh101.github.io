# Portfolio stack

Static Nginx deployment for `portfolio.sichi.me`.

Deploy from the portfolio repo:

```bash
docker compose -f /opt/stacks/portfolio/compose.yaml up -d
```

Traefik should route `portfolio.sichi.me` to `http://mochi-portfolio:80` on the
`mochi-proxy` network.
