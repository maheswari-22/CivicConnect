# Getting emails to actually arrive

CivicConnect sends email for: **forgot password**, **confirming an email address**, **changing an email**, and
**worker approved**. If `SMTP_HOST` is empty (the default), nothing is sent: each email is **printed in the
backend terminal** instead, so you can copy the link while developing. That is why "the mail isn't coming".

## 1. Gmail (easiest) — 5 minutes

1. Use a Gmail account for the project (a new one such as `civicconnect.yourname@gmail.com` is best).
2. Turn on **2-Step Verification**: Google Account → Security → 2-Step Verification.
3. Create an **App password**: Google Account → Security → 2-Step Verification → *App passwords*
   (or open https://myaccount.google.com/apppasswords). Name it "CivicConnect". Google shows 16 letters like
   `abcd efgh ijkl mnop`. Your normal Gmail password will **not** work.
4. Put this in `Backend/.env` (spaces in the app password are fine, they are ignored):

   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=youraddress@gmail.com
   SMTP_PASS=abcdefghijklmnop
   ```
   (`MAIL_FROM` can stay as it is: for Gmail the app automatically sends as `SMTP_USER`, because Gmail refuses other sender addresses.)
5. Restart the backend (`.env` is read at start-up). The terminal should print
   `[mail] SMTP login OK (smtp.gmail.com)`.
6. Send yourself a real test: `cd Backend && npm run mail:test you@example.com`
7. Use **Forgot password** in the app. Look in the inbox **and the Spam folder** (first mails from a new Gmail sender often land there; mark "Not spam").

## 1b. What a user can and cannot reset

A reset email is sent only when the account **has an email address**. Authority: Employee ID **and** registered email must both match.
Worker: username or email. Citizen: email or mobile number, but the link goes to the account's **email**, so a citizen who signed up with a
mobile number only (no email) cannot receive one: ask them to add an email in Profile, or reset it from the database. After a successful reset,
the owner receives a "your password was changed" email, and every older session is signed out.

## 2. What the messages mean

The app now explains failures in plain words, in the terminal and in `npm run mail:test`:

| You see | Meaning / fix |
|---|---|
| "rejected the login ... App Password" | Wrong `SMTP_USER`/`SMTP_PASS`, or you used your normal password. Make a new App password. |
| "Could not reach smtp.gmail.com:587" | No internet, or your network blocks SMTP. Try `SMTP_PORT=465` with `SMTP_SECURE=true`, or another network / phone hotspot. |
| "TLS mismatch" | 587 needs `SMTP_SECURE=false`; 465 needs `SMTP_SECURE=true`. |
| `[mail:dev] SMTP not configured` | `SMTP_HOST` is empty — see step 4. |
| `[mail] sent "..." to ...` but nothing in the inbox | The mail left your server. Check Spam, check the address you typed, wait a minute. |

A reset email is only generated if the account exists **and has that email** (check with
`SELECT email FROM users;` in psql). The page always says "if an account matches ..." on purpose, so strangers can't find out which emails are registered.

## 3. Other providers

Any SMTP service works: Outlook (`smtp-mail.outlook.com`, 587), Brevo (`smtp-relay.brevo.com`, 587), SendGrid
(`smtp.sendgrid.net`, user `apikey`), Amazon SES, Zoho. For a real deployment use a transactional provider with
your own domain, and set `MAIL_FROM` to an address on that domain.

## 4. Without any email account (development only)

Keep `SMTP_HOST` empty and `DEV_MAIL_HINT=true`. The forgot-password page then tells you to look in the backend
terminal, where the reset link is printed. In production (`NODE_ENV=production`) the server refuses to start without `SMTP_HOST`.
