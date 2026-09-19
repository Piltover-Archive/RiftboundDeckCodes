# Contributing to RiftboundDeckCodes

Thank you for your interest in contributing to RiftboundDeckCodes! This document provides guidelines for contributing to the project.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/yourusername/RiftboundDeckCodes.git
   cd RiftboundDeckCodes
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Build the project**:
   ```bash
   npm run build
   ```

## Development Workflow

1. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the code style guidelines below

3. **Test your changes** thoroughly

4. **Build and verify** there are no errors:
   ```bash
   npm run build
   ```

5. **Commit your changes** with a clear commit message:
   ```bash
   git commit -m "Add feature: description of what you added"
   ```

6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Open a Pull Request** on the main repository

## Code Style Guidelines

- Use **tabs for indentation** (project standard)
- Follow **TypeScript best practices**
- Add **JSDoc comments** for public functions
- Use **clear, descriptive variable names**
- Keep functions focused and single-purpose

## Adding New Sets or Variants

When Riftbound releases new sets or variants, they need to be added to `src/mappings.ts`:

### Adding a New Set

```typescript
export const SET_MAP: Record<string, number> = {
	OGN: 0,
	OGS: 1,
	ARC: 2,
	SFD: 3,
	UNL: 4,
	VEN: 5,
	RAD: 6,
	NEW: 7,  // Add new set here with next available ID
};
```

### Adding a New Variant

```typescript
export const VARIANT_MAP: Record<string, number> = {
	"": 0,
	a: 1,
	s: 2,
	"*": 2, // Alternative signed notation — shares the id with `s`
	b: 3,
	c: 4,  // Add new variant here with next available ID
};
```

**Important:** Once released, never change existing IDs as this will break existing deck codes!

## Implementing in Other Languages

We welcome implementations of RiftboundDeckCodes in other programming languages! To ensure compatibility:

1. **Follow the format specification** exactly as described in the README
2. **Test against known deck codes** from the TypeScript implementation
3. **Ensure varint encoding** matches the reference implementation
4. **Document your implementation** thoroughly
5. **Submit a PR** to add your implementation to the README

### Testing Compatibility

The authoritative vectors live in `test/fixtures/` and are asserted byte-for-byte
by `npm test`, so they cannot drift from the implementation:

- `golden.json` — Version 3 and 4 vectors, locked since the 1.3.0 build.
- `golden-v6.json` — Version 6 vectors, with and without a chosen champion.

Port them directly. Two worked examples:

**Test Deck 1 (Version 3 — no runes, no sideboard, no champion):**
```
Main Deck:
- 3x OGN-007
- 2x OGN-089
- 1x OGN-004

Expected Code: CMAAAAAAAAAAAAAAAEAQAAAHAEAQAACZAEAQAAAEAAAAAAA
```

**Test Deck 2 (Version 6 — additional legends):**
```
Main Deck:
- 3x OGN-004
- 3x OGN-009
- 1x OGN-013

Additional Legends:
- OGN-280
- OGN-288
- OGN-292

Expected Code: CYAAEAYBAIAAABAJAEAQCAAABUAAAAYAACMAEAAAUABAAAFEAI
```

## Reporting Issues

When reporting issues, please include:

- **Deck code** that causes the issue (if applicable)
- **Expected behavior** vs actual behavior
- **Steps to reproduce** the issue
- **Environment** (Node version, OS, etc.)

## Feature Requests

We welcome feature requests! Please:

- Check existing issues first to avoid duplicates
- Clearly describe the use case
- Explain why it would be valuable to the community
- Consider submitting a PR if you can implement it

## Version Management

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** version for incompatible API changes
- **MINOR** version for new functionality in a backwards-compatible manner
- **PATCH** version for backwards-compatible bug fixes

## License

By contributing to RiftboundDeckCodes, you agree that your contributions will be licensed under the Apache License 2.0.

## Questions?

If you have questions about contributing, feel free to open an issue or reach out to the maintainers.

---

Thank you for contributing to RiftboundDeckCodes! 🎮
