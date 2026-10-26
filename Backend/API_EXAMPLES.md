# Quick API examples

## Login

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"citizen@civicconnect.com","password":"citizen@1234"}'
```

Copy the returned `data.token` into `TOKEN`.

## Create complaint

```bash
curl -X POST http://localhost:4000/api/citizen/complaints \
  -H "Authorization: Bearer $TOKEN" \
  -F category=road \
  -F description='Large pothole near the junction after heavy rain.' \
  -F location='Main Road, Ward 12' \
  -F lat=17.385 \
  -F lng=78.4867
```

## Authority login

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"AUTH-001","password":"authority@1234"}'
```

## List complaints

```bash
curl http://localhost:4000/api/authority/complaints \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

## Assign a worker

```bash
curl -X POST http://localhost:4000/api/authority/complaints/CC-2026-1281/assign \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"workerId":"usr_WK-105","priority":"High","note":"Patch and compact before evening traffic."}'
```

## Worker login

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"wk-105","password":"worker@1234"}'
```

## Start task

```bash
curl -X POST http://localhost:4000/api/worker/tasks/CC-2026-1281/start \
  -H "Authorization: Bearer $WORKER_TOKEN"
```

## Upload progress photo

```bash
curl -X POST http://localhost:4000/api/worker/tasks/CC-2026-1281/progress-photo \
  -H "Authorization: Bearer $WORKER_TOKEN" \
  -F 'photo=@./progress.jpg' \
  -F 'caption=Road surface prepared for filling'
```

## Upload completion photo and complete

```bash
curl -X POST http://localhost:4000/api/worker/tasks/CC-2026-1281/completion-photo \
  -H "Authorization: Bearer $WORKER_TOKEN" \
  -F 'photo=@./completed.jpg'

curl -X POST http://localhost:4000/api/worker/tasks/CC-2026-1281/complete \
  -H "Authorization: Bearer $WORKER_TOKEN"
```
