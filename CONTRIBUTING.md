# Contributing to Google Ads MCP

Thanks for considering contributing! This project aims to make Google Ads management more accessible through natural language.

## How to Contribute

### Reporting Issues

Found a bug or have a feature request? Open an issue with:
- Clear description of the problem/feature
- Steps to reproduce (for bugs)
- Expected vs actual behavior
- Your environment (Bun/Node version, OS, Claude version)

### Submitting Pull Requests

1. **Fork and clone the repository**
```bash
git clone https://github.com/yourusername/google-ads-mcp
cd google-ads-mcp
bun install
```

2. **Create a feature branch**
```bash
git checkout -b feature/your-feature-name
```

3. **Make your changes**
- Follow existing code style
- Add tests for new features
- Update documentation as needed
- Keep commits focused and clear

4. **Test thoroughly**
```bash
bun test
bun run typecheck
bun run build
```

5. **Submit PR**
- Describe what changes you made and why
- Link any related issues
- Include examples of the feature in action

## Development Guidelines

### Code Style
- TypeScript with strict mode
- Clear variable/function names
- Comments for complex logic
- Error handling for all API calls

### Adding New Tools
When adding MCP tools:
1. Place in appropriate directory (`tools/read/`, `tools/write/`, etc.)
2. Include TypeScript types
3. Add safety checks for write operations
4. Document parameters clearly
5. Add to README tools list

### Testing
- Test with actual Google Ads accounts (use test campaigns)
- Verify dry_run mode works
- Check error messages are helpful
- Test with various account configurations

### Safety First
All write operations must:
- Support dry_run mode
- Have clear confirmation messages
- Include rollback instructions where possible
- Default to safe values (campaigns start paused, etc.)

## Priority Areas

We especially welcome contributions for:
- **Smart bidding strategies** - Automated bid adjustments
- **Bulk operations** - Operating on multiple entities at once
- **Performance insights** - Smarter analysis and recommendations
- **Additional GAQL templates** - Common query patterns
- **Error recovery** - Better handling of API limits and failures
- **Documentation** - Tutorials, examples, best practices

## Questions?

Feel free to open a discussion if you want to talk through an idea before implementing.

## Code of Conduct

- Be respectful and constructive
- Welcome newcomers and help them get started
- Focus on what's best for the community
- Show empathy towards other community members

## License

By contributing, you agree that your contributions will be licensed under the MIT License.