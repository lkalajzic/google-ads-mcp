# Security Policy

## Reporting Security Vulnerabilities

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to: hello@lukakalajzic.com

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

Please include the requested information listed below to help us better understand the nature and scope of the possible issue:

- Type of issue (e.g., credential exposure, unauthorized access, data leak)
- Full paths of source file(s) related to the manifestation of the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

## Security Considerations

### API Credentials
- **Never commit credentials** - All secrets should be in `.env` files
- **Use environment variables** - Never hardcode tokens or IDs
- **Refresh tokens** - Store securely, rotate if compromised
- **Developer tokens** - Keep confidential, use separate tokens for dev/prod

### Google Ads Operations
- **Dry run mode** - Always test operations before executing
- **Budget limits** - Implement hard caps in production
- **Campaign status** - Default to PAUSED for new campaigns
- **Change validation** - Verify all modifications before applying

### MCP Server Security
- **Local only** - The server runs locally, not exposed to internet
- **Process isolation** - Runs in Claude's sandboxed environment
- **Token scope** - Use minimum required OAuth scopes
- **Audit logging** - Track all operations in changelog

### Best Practices for Users
1. **Separate test account** - Use a test MCC for development
2. **Budget alerts** - Set up Google Ads alerts as backup
3. **Regular audits** - Review change history frequently
4. **Token rotation** - Refresh OAuth tokens periodically
5. **Access control** - Limit who can modify Claude config

## Known Security Considerations

### Current Limitations
- OAuth refresh tokens don't auto-rotate (Google limitation)
- No built-in rate limiting (relies on Google's API limits)
- Changelog is local only (not centralized)

### Mitigations
- Always use dry_run for testing
- Implement budget caps in context files
- Regular manual token rotation
- Monitor Google Ads change history

## Updates and Patches

Security updates will be released as soon as possible after discovery. Update by:

```bash
cd google-ads-mcp
git pull
bun install
bun run build
```

## Scope

This security policy applies to:
- The MCP server codebase
- Configuration and setup scripts
- Documentation and examples

It does NOT cover:
- Google Ads API security (managed by Google)
- Claude Desktop security (managed by Anthropic)
- User's Google Ads account security (user responsibility)

## Acknowledgments

We appreciate responsible disclosure and will acknowledge security researchers who report valid issues (with permission).