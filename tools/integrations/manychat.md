# ManyChat

Chat marketing automation for Instagram DMs, Facebook Messenger, WhatsApp, Telegram, and SMS. Most often used to turn Instagram comments and DMs into leads (comment-to-DM, keyword triggers, story replies) and push them into an email platform.

## Capabilities

| Integration | Available | Notes |
|-------------|-----------|-------|
| API | ✓ | REST API - subscribers, tags, custom fields, flows, sending |
| MCP | - | Not available (use Zapier or Composio if needed) |
| CLI | ✓ | [manychat.js](../clis/manychat.js) |
| SDK | - | Not available |

## Authentication

- **Type**: Bearer Token (API key per account/page)
- **Header**: `Authorization: Bearer {api_key}`
- **Get key**: ManyChat > Settings > API > Generate API Key (requires a Pro plan)
- **Env var**: `MANYCHAT_API_KEY`

All endpoints live under `https://api.manychat.com/fb/...`. The `/fb/` prefix is historical: the same endpoints work for Instagram, WhatsApp and Telegram contacts in the account.

## Common Agent Operations

### Get account info

```bash
GET https://api.manychat.com/fb/page/getInfo
```

### List flows (to get `flow_ns`)

```bash
GET https://api.manychat.com/fb/page/getFlows
```

### List tags / create tag

```bash
GET https://api.manychat.com/fb/page/getTags

POST https://api.manychat.com/fb/page/createTag
{ "name": "lead-curso-rcp" }
```

### List / create custom fields

```bash
GET https://api.manychat.com/fb/page/getCustomFields

POST https://api.manychat.com/fb/page/createCustomField
{ "caption": "profesion", "type": "text", "description": "Profesión sanitaria del lead" }
```

### Find a contact by email or phone

```bash
GET https://api.manychat.com/fb/subscriber/findBySystemField?email=user@example.com
GET https://api.manychat.com/fb/subscriber/findBySystemField?phone=+34600000000
```

### Get contact info

```bash
GET https://api.manychat.com/fb/subscriber/getInfo?subscriber_id={subscriber_id}
```

### Tag a contact

```bash
POST https://api.manychat.com/fb/subscriber/addTagByName
{ "subscriber_id": 123456789, "tag_name": "lead-curso-rcp" }
```

### Set custom field

```bash
POST https://api.manychat.com/fb/subscriber/setCustomFieldByName
{ "subscriber_id": 123456789, "field_name": "profesion", "field_value": "Enfermería" }
```

### Trigger a flow for a contact

```bash
POST https://api.manychat.com/fb/sending/sendFlow
{ "subscriber_id": 123456789, "flow_ns": "content20240101000000_000000" }
```

### Send a message (Instagram)

```bash
POST https://api.manychat.com/fb/sending/sendContent
{
  "subscriber_id": 123456789,
  "data": {
    "version": "v2",
    "content": {
      "type": "instagram",
      "messages": [{ "type": "text", "text": "¡Aquí tienes tu guía!" }]
    }
  }
}
```

## CLI Examples

```bash
export MANYCHAT_API_KEY=your_key

node tools/clis/manychat.js page info
node tools/clis/manychat.js page flows
node tools/clis/manychat.js tags list
node tools/clis/manychat.js tags create --name lead-curso-rcp
node tools/clis/manychat.js fields create --name profesion --type text
node tools/clis/manychat.js subscribers find-by-email --email user@example.com
node tools/clis/manychat.js subscribers get 123456789
node tools/clis/manychat.js tag add 123456789 --name lead-curso-rcp
node tools/clis/manychat.js field set 123456789 --name profesion --value "Enfermería"
node tools/clis/manychat.js send flow 123456789 --flow-ns content20240101000000_000000
node tools/clis/manychat.js send text 123456789 --text "¡Gracias!" --channel instagram

# Preview any request without sending it
node tools/clis/manychat.js send text 123456789 --text "Hola" --dry-run
```

## Key Concepts

- **Contacts (subscribers)** - People who have interacted with your account; `subscriber_id` is the key for most calls
- **Flows** - Automated conversations; identified by `flow_ns`
- **Triggers** - Keyword DMs, comment-to-DM on posts/reels, story replies, ref links
- **Tags** - Labels for segmentation (e.g. which lead magnet a lead requested)
- **Custom Fields** - Per-contact data (email, profession, interest)
- **Bot Fields** - Account-wide variables (e.g. current webinar date)
- **External Request** - Flow action that POSTs contact data to any webhook (your email platform, Zapier, Make)

## Instagram Lead Capture Pattern

The typical Instagram → email pipeline:

1. **Trigger**: comment keyword on a reel/post (e.g. "RCP") or DM keyword
2. **Flow**: public auto-reply to the comment + DM with the promise
3. **Capture**: ask for email with a User Input block (validated as email) → saved to the system `email` field
4. **Tag**: add a tag per lead magnet (`lead-guia-triage`, `lead-curso-rcp`)
5. **Sync**: send the contact to your email platform via the native integration (Mailchimp, ActiveCampaign, Kit, HubSpot), an **External Request** to its API, or Zapier/Make
6. **Deliver**: the email platform sends the lead magnet and starts the nurture sequence

Use the API to audit and maintain this setup: list flows and tags, check a lead's tags/fields, re-trigger a flow for leads who never confirmed email, or tag segments in bulk.

## Messaging Rules

- **24-hour window**: on Instagram and Messenger you can only send free-form messages within 24h of the contact's last interaction
- Outside the window, Messenger requires a valid `message_tag`; Instagram only allows `HUMAN_AGENT` (7 days) for manual support replies
- WhatsApp outside 24h requires approved templates
- Never use the API to send promotional broadcasts outside these rules; Meta can restrict the account

## Rate Limits

- Varies by endpoint, typically 10-25 requests per second per account
- Sending endpoints (`sendContent`, `sendFlow`) are the most restricted; batch with small delays

## When to Use

- Instagram comment-to-DM lead capture
- Delivering lead magnets via DM
- Qualifying leads with quick questions before sending to email
- Segmenting Instagram audience with tags
- Syncing Instagram leads into email platforms

## Relevant Skills

- social-content
- lead-magnets
- email-sequence
- copywriting
