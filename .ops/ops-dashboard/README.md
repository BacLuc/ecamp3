# ops-dashboard

This is a helm chart to deploy an oauth2-proxy and a homer dashboard.
Then the ecamp3-developers can use their github login
to see our applications like graphana, kibana, kubernetes-dashboard...

## Prerequisites

You need the oauth2-proxy helm chart:

```shell
helm repo add oauth2-proxy https://oauth2-proxy.github.io/manifests
helm repo update
```

## Deployment

First, make sure you don't overwrite the configuration currently applied:

```shell
helm get values ops-dashboard
```

Fill in the values for values.access.yaml according to demo.values.access.yaml

```shell
cp demo.values.access.yaml values.access.yaml 
```
