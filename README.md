# staking-efficiency-indexer-alt

## Development

### Getting started

1. Set your `.env` based on the `env-example`

2. Install dependencies

```
npm install --save-dev @google-cloud/functions-framework
```

3. Test the framework:

```
npm run dev
```

## Deployment

Generate `.env.yaml` from the `.env` file, then:

```
gcloud functions deploy staking-efficiency-indexer-alt \
    --region=europe-west3 --source=. \
    --trigger-http --allow-unauthenticated \
    --runtime=nodejs14 --env-vars-file=./.env.yaml \
    --timeout=540s
```
