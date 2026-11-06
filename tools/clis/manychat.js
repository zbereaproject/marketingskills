#!/usr/bin/env node

const API_KEY = process.env.MANYCHAT_API_KEY
const BASE_URL = 'https://api.manychat.com'

function parseArgs(argv) {
  const result = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const next = argv[i + 1]
      if (next && !next.startsWith('--')) {
        result[key] = next
        i++
      } else {
        result[key] = true
      }
    } else {
      result._.push(arg)
    }
  }
  return result
}

const args = parseArgs(process.argv.slice(2))
const [cmd, sub, ...rest] = args._

const usage = {
  page: 'page [info|flows|growth-tools|bot-fields|set-bot-field] [--field-id <id>] [--value <value>]',
  tags: 'tags [list|create|delete|delete-by-name] [--name <name>] [--tag-id <id>]',
  fields: 'fields [list|create] [--name <caption>] [--type text|number|date|datetime|boolean] [--description <text>]',
  subscribers: 'subscribers [get|find-by-email|find-by-phone|find-by-name|find-by-field|create|update] [subscriber_id] [--email <email>] [--phone <phone>] [--name <name>] [--field-id <id>] [--value <value>] [--first-name <n>] [--last-name <n>] [--whatsapp-phone <phone>] [--consent-phrase <text>]',
  tag: 'tag [add|remove] <subscriber_id> (--tag-id <id> | --name <tag_name>)',
  field: 'field set <subscriber_id> (--field-id <id> | --name <field_name>) --value <value>  |  field set-many <subscriber_id> --fields <json>',
  send: 'send [flow|text] <subscriber_id> [--flow-ns <flow_ns>] [--text <message>] [--channel instagram|facebook|whatsapp|telegram] [--message-tag <tag>]',
  global: '--dry-run previews the request without sending it',
}

async function api(method, path, { query, body } = {}) {
  const url = new URL(`${BASE_URL}${path}`)
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
    }
  }
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  }
  if (body) opts.body = JSON.stringify(body)

  if (args['dry-run']) {
    return {
      _dry_run: true,
      method,
      url: url.toString(),
      headers: { ...opts.headers, Authorization: 'Bearer ***' },
      body: body || undefined,
    }
  }

  const res = await fetch(url.toString(), opts)
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return { status: res.status, body: text }
  }
}

function requireId(id, label = 'Subscriber ID') {
  if (!id) return { error: `${label} required` }
  return null
}

function coerceValue(value) {
  if (value === undefined) return undefined
  if (value === 'true') return true
  if (value === 'false') return false
  if (value !== '' && !isNaN(Number(value))) return Number(value)
  return value
}

function buildTextMessage(text, channel) {
  const content = { messages: [{ type: 'text', text }] }
  if (channel && channel !== 'facebook') content.type = channel
  return { version: 'v2', content }
}

async function main() {
  if (!cmd || cmd === 'help' || args.help) {
    console.log(JSON.stringify({ usage }, null, 2))
    return
  }

  if (!API_KEY && !args['dry-run']) {
    console.error(JSON.stringify({ error: 'MANYCHAT_API_KEY environment variable required (ManyChat > Settings > API)' }))
    process.exit(1)
  }

  let result

  switch (cmd) {
    case 'page':
      switch (sub) {
        case 'info':
          result = await api('GET', '/fb/page/getInfo')
          break
        case 'flows':
          result = await api('GET', '/fb/page/getFlows')
          break
        case 'growth-tools':
          result = await api('GET', '/fb/page/getGrowthTools')
          break
        case 'bot-fields':
          result = await api('GET', '/fb/page/getBotFields')
          break
        case 'set-bot-field':
          if (!args['field-id'] || args.value === undefined) { result = { error: '--field-id and --value required' }; break }
          result = await api('POST', '/fb/page/setBotField', {
            body: { field_id: Number(args['field-id']), field_value: coerceValue(args.value) },
          })
          break
        default:
          result = { error: 'Unknown page subcommand. Use: info, flows, growth-tools, bot-fields, set-bot-field' }
      }
      break

    case 'tags':
      switch (sub) {
        case 'list':
          result = await api('GET', '/fb/page/getTags')
          break
        case 'create':
          if (!args.name) { result = { error: '--name required' }; break }
          result = await api('POST', '/fb/page/createTag', { body: { name: args.name } })
          break
        case 'delete':
          if (!args['tag-id']) { result = { error: '--tag-id required' }; break }
          result = await api('POST', '/fb/page/removeTag', { body: { tag_id: Number(args['tag-id']) } })
          break
        case 'delete-by-name':
          if (!args.name) { result = { error: '--name required' }; break }
          result = await api('POST', '/fb/page/removeTagByName', { body: { tag_name: args.name } })
          break
        default:
          result = { error: 'Unknown tags subcommand. Use: list, create, delete, delete-by-name' }
      }
      break

    case 'fields':
      switch (sub) {
        case 'list':
          result = await api('GET', '/fb/page/getCustomFields')
          break
        case 'create': {
          if (!args.name) { result = { error: '--name required' }; break }
          const body = { caption: args.name, type: args.type || 'text' }
          if (args.description) body.description = args.description
          result = await api('POST', '/fb/page/createCustomField', { body })
          break
        }
        default:
          result = { error: 'Unknown fields subcommand. Use: list, create' }
      }
      break

    case 'subscribers':
      switch (sub) {
        case 'get':
          result = requireId(rest[0]) || await api('GET', '/fb/subscriber/getInfo', { query: { subscriber_id: rest[0] } })
          break
        case 'find-by-email':
          if (!args.email) { result = { error: '--email required' }; break }
          result = await api('GET', '/fb/subscriber/findBySystemField', { query: { email: args.email } })
          break
        case 'find-by-phone':
          if (!args.phone) { result = { error: '--phone required' }; break }
          result = await api('GET', '/fb/subscriber/findBySystemField', { query: { phone: args.phone } })
          break
        case 'find-by-name':
          if (!args.name) { result = { error: '--name required' }; break }
          result = await api('GET', '/fb/subscriber/findByName', { query: { name: args.name } })
          break
        case 'find-by-field':
          if (!args['field-id'] || args.value === undefined) { result = { error: '--field-id and --value required' }; break }
          result = await api('GET', '/fb/subscriber/findByCustomField', {
            query: { field_id: args['field-id'], field_value: args.value },
          })
          break
        case 'create':
        case 'update': {
          const body = {}
          if (sub === 'update') {
            const err = requireId(rest[0])
            if (err) { result = err; break }
            body.subscriber_id = Number(rest[0])
          }
          if (args['first-name']) body.first_name = args['first-name']
          if (args['last-name']) body.last_name = args['last-name']
          if (args.email) body.email = args.email
          if (args.phone) body.phone = args.phone
          if (args['whatsapp-phone']) body.whatsapp_phone = args['whatsapp-phone']
          if (args.gender) body.gender = args.gender
          if (args['opt-in-email']) body.has_opt_in_email = args['opt-in-email'] !== 'false'
          if (args['opt-in-sms']) body.has_opt_in_sms = args['opt-in-sms'] !== 'false'
          if (args['consent-phrase']) body.consent_phrase = args['consent-phrase']
          if (sub === 'create' && !body.email && !body.phone && !body.whatsapp_phone) {
            result = { error: 'create requires at least one of --email, --phone or --whatsapp-phone' }
            break
          }
          const path = sub === 'create' ? '/fb/subscriber/createSubscriber' : '/fb/subscriber/updateSubscriber'
          result = await api('POST', path, { body })
          break
        }
        default:
          result = { error: 'Unknown subscribers subcommand. Use: get, find-by-email, find-by-phone, find-by-name, find-by-field, create, update' }
      }
      break

    case 'tag': {
      const err = requireId(rest[0])
      if (err) { result = err; break }
      if (sub !== 'add' && sub !== 'remove') { result = { error: 'Unknown tag subcommand. Use: add, remove' }; break }
      const subscriber_id = Number(rest[0])
      const verb = sub === 'add' ? 'addTag' : 'removeTag'
      if (args['tag-id']) {
        result = await api('POST', `/fb/subscriber/${verb}`, { body: { subscriber_id, tag_id: Number(args['tag-id']) } })
      } else if (args.name) {
        result = await api('POST', `/fb/subscriber/${verb}ByName`, { body: { subscriber_id, tag_name: args.name } })
      } else {
        result = { error: '--tag-id or --name required' }
      }
      break
    }

    case 'field': {
      const err = requireId(rest[0])
      if (err) { result = err; break }
      const subscriber_id = Number(rest[0])
      switch (sub) {
        case 'set':
          if (args.value === undefined) { result = { error: '--value required' }; break }
          if (args['field-id']) {
            result = await api('POST', '/fb/subscriber/setCustomField', {
              body: { subscriber_id, field_id: Number(args['field-id']), field_value: coerceValue(args.value) },
            })
          } else if (args.name) {
            result = await api('POST', '/fb/subscriber/setCustomFieldByName', {
              body: { subscriber_id, field_name: args.name, field_value: coerceValue(args.value) },
            })
          } else {
            result = { error: '--field-id or --name required' }
          }
          break
        case 'set-many': {
          if (!args.fields) { result = { error: '--fields required (JSON array of {field_id|field_name, field_value})' }; break }
          let fields
          try { fields = JSON.parse(args.fields) } catch { result = { error: 'Invalid JSON in --fields' }; break }
          if (!Array.isArray(fields)) { result = { error: '--fields must be a JSON array' }; break }
          result = await api('POST', '/fb/subscriber/setCustomFields', { body: { subscriber_id, fields } })
          break
        }
        default:
          result = { error: 'Unknown field subcommand. Use: set, set-many' }
      }
      break
    }

    case 'send': {
      const err = requireId(rest[0])
      if (err) { result = err; break }
      const subscriber_id = Number(rest[0])
      switch (sub) {
        case 'flow':
          if (!args['flow-ns']) { result = { error: '--flow-ns required (get it from: page flows)' }; break }
          result = await api('POST', '/fb/sending/sendFlow', { body: { subscriber_id, flow_ns: args['flow-ns'] } })
          break
        case 'text': {
          if (!args.text) { result = { error: '--text required' }; break }
          const body = { subscriber_id, data: buildTextMessage(args.text, args.channel || 'instagram') }
          if (args['message-tag']) body.message_tag = args['message-tag']
          result = await api('POST', '/fb/sending/sendContent', { body })
          break
        }
        default:
          result = { error: 'Unknown send subcommand. Use: flow, text' }
      }
      break
    }

    default:
      result = { error: 'Unknown command', usage }
  }

  console.log(JSON.stringify(result, null, 2))
}

main().catch(err => {
  console.error(JSON.stringify({ error: err.message }))
  process.exit(1)
})
