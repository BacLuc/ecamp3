# Helm infrastructure for ecamp3

Here you also have some scripts to deploy ecamp3 from your local machine.

## Prepare

First you need to have the following dependencies:

- yq
- kubectl (with a kubeconfig for the cluster you want to deploy to)
- helm
- helmfile
- docker (with a public repository to push images to)
- openssl

## Setup

If you don't have JWT Passphrase, public and private key yet, you have to run:

```shell
./generate-jwt-values.sh
```

This copies [env.example.yaml](ecamp3/env.example.yaml) to [env.yaml](ecamp3/env.yaml)
if not exists and sets the jwt values.

Then you have to set the values in [env.yaml](ecamp3/env.yaml which are not set to any value.
(e.g. POSTGRES_URL).

## Migration from ingress-nginx

The deployment now uses the Traefik Gateway API. Before deploying this version,
remove the old ingress-nginx release:

```shell
helm uninstall ecamp3-ingress --namespace ingress-nginx
```

In `env.yaml`, rename `INGRESS_ENABLED` to `GATEWAY_ENABLED` and
`PRINT_INGRESS_READ_TIMEOUT_SECONDS` to
`PRINT_GATEWAY_READ_TIMEOUT_SECONDS`. The legacy Ingress settings are no longer
supported.

## Build images

```shell
./build-images.sh
```

## Deploy to cluster

To diff the deployment

```shell
./deploy-to-cluster.sh
```

To deploy

```shell
./deploy-to-cluster.sh deploy
```

## For convenience

If you did not build the images for a long time, you have the convenience script:

```shell
./build-and-deploy.sh
```
