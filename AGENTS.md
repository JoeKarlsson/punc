# Punc Project Agents

This document defines specialized AI agents for the Punc project - a TypeScript library for analyzing punctuation patterns in text files and generating PDF visualizations.

## Project Overview

**Punc** is a modern TypeScript library that:

- Extracts and counts punctuation marks from text files
- Calculates words-per-sentence averages
- Generates PDF visualizations showing only punctuation patterns
- Supports extensive Unicode punctuation symbols
- Provides comprehensive text analysis capabilities

## Agent Roles

### 1. Text Analysis Agent

**Role**: Specialized in text processing and punctuation analysis
**Responsibilities**:

- Analyze text files for punctuation patterns
- Count and categorize punctuation marks
- Calculate statistical metrics (words per sentence)
- Process various text encodings and formats
- Handle Unicode punctuation symbols

**Key Skills**:

- Text parsing and analysis
- Regular expression expertise
- Statistical analysis
- Character encoding knowledge
- Stream processing

**Files to Focus On**:

- `src/punc.ts` - Main analysis function
- `src/streams.ts` - Stream processing utilities
- `src/types.ts` - Punctuation type definitions
- `src/validation.ts` - Input validation

### 2. PDF Generation Agent

**Role**: Specialized in PDF creation and visualization
**Responsibilities**:

- Generate PDF visualizations of punctuation patterns
- Handle font rendering and layout
- Create visual representations of text analysis
- Manage PDF file output and formatting

**Key Skills**:

- PDFKit library expertise
- Font and typography knowledge
- Visual design principles
- File system operations
- Layout and positioning

**Files to Focus On**:

- `src/pdf.ts` - PDF generation functionality
- `lib/fonts/` - Font resources
- `src/mapping.ts` - Punctuation mapping utilities

### 3. Testing Agent

**Role**: Specialized in testing and quality assurance
**Responsibilities**:

- Write comprehensive unit tests
- Test edge cases and error handling
- Validate API functionality
- Ensure code coverage
- Test integration scenarios

**Key Skills**:

- Jest testing framework
- Test-driven development
- Mocking and stubbing
- Assertion writing
- Coverage analysis

**Files to Focus On**:

- `tests/` directory - All test files
- `jest.config.js` - Test configuration
- `tests/modules/` - Module-specific tests

### 4. Build & Deployment Agent

**Role**: Specialized in build processes and deployment
**Responsibilities**:

- Manage TypeScript compilation
- Handle ESBuild bundling
- Configure build pipelines
- Manage dependencies
- Handle publishing processes

**Key Skills**:

- TypeScript compilation
- ESBuild bundling
- npm package management
- Build optimization
- CI/CD pipeline configuration

**Files to Focus On**:

- `package.json` - Package configuration
- `tsconfig.json` - TypeScript configuration
- `eslint.config.js` - Linting configuration
- `dist/` - Build output directory

### 5. Documentation Agent

**Role**: Specialized in documentation and user experience
**Responsibilities**:

- Maintain API documentation
- Write usage examples
- Create tutorials and guides
- Update README files
- Generate type documentation

**Key Skills**:

- Technical writing
- API documentation
- Markdown formatting
- Code examples
- User experience design

**Files to Focus On**:

- `README.md` - Main documentation
- `LICENSE` - License information
- `src/index.ts` - Public API exports
- Type definitions in `src/types.ts`

## Agent Collaboration Patterns

### Text Analysis + PDF Generation

- Text Analysis Agent processes input files
- PDF Generation Agent creates visualizations from analysis results
- Shared data structures and interfaces

### Testing + All Other Agents

- Testing Agent validates functionality from all other agents
- Cross-agent integration testing
- End-to-end workflow validation

### Build + Documentation

- Build Agent ensures proper exports
- Documentation Agent maintains accurate API docs
- Synchronized version management

## Common Workflows

### 1. Adding New Punctuation Support

1. **Text Analysis Agent**: Extends `PunctuationCount` interface
2. **Testing Agent**: Adds test cases for new punctuation
3. **Documentation Agent**: Updates API documentation
4. **Build Agent**: Ensures proper type exports

### 2. Performance Optimization

1. **Text Analysis Agent**: Optimizes stream processing
2. **Testing Agent**: Adds performance benchmarks
3. **Build Agent**: Optimizes bundle size
4. **Documentation Agent**: Updates performance notes

### 3. Bug Fixing

1. **Testing Agent**: Identifies and reproduces issues
2. **Text Analysis Agent**: Fixes core logic
3. **PDF Generation Agent**: Fixes visualization issues
4. **Testing Agent**: Validates fixes

## Agent Communication Protocols

### Data Exchange

- Use TypeScript interfaces for type safety
- Share results through `PuncResult` and `PDFResult` interfaces
- Maintain consistent error handling patterns

### Error Handling

- All agents should handle errors gracefully
- Use descriptive error messages
- Log warnings for non-fatal issues
- Validate inputs and outputs

### Code Standards

- Follow ESLint configuration
- Use Prettier for formatting
- Maintain TypeScript strict mode
- Write comprehensive tests

## Development Guidelines

### For Text Analysis Agent

- Focus on accuracy and performance
- Handle edge cases (empty files, special characters)
- Optimize for large file processing
- Maintain backward compatibility

### For PDF Generation Agent

- Ensure consistent visual output
- Handle font fallbacks gracefully
- Optimize PDF file sizes
- Support various page layouts

### For Testing Agent

- Aim for 100% code coverage
- Test both success and failure cases
- Include integration tests
- Validate performance benchmarks

### For Build Agent

- Maintain clean build outputs
- Optimize bundle sizes
- Handle dependency updates
- Ensure cross-platform compatibility

### For Documentation Agent

- Keep examples up-to-date
- Write clear, concise descriptions
- Include practical use cases
- Maintain consistent formatting

## Agent-Specific Commands

### Text Analysis Agent

```bash
# Run text analysis tests
npm test -- --testPathPattern=streams.test.ts

# Test specific punctuation patterns
npm test -- --testNamePattern="punctuation"
```

### PDF Generation Agent

```bash
# Test PDF generation
npm test -- --testPathPattern=pdf.test.ts

# Generate test PDFs
node -e "import('./dist/index.js').then(m => m.createPDF('test-simple.txt'))"
```

### Testing Agent

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Build Agent

```bash
# Build project
npm run build

# Type check
npm run type-check

# Lint code
npm run lint
```

### Documentation Agent

```bash
# Lint markdown
npm run markdown-lint

# Format code
npm run format

# Run all checks
npm run check
```

## Success Metrics

### Text Analysis Agent

- Processing speed for large files
- Accuracy of punctuation counting
- Memory efficiency
- Error handling coverage

### PDF Generation Agent

- PDF generation success rate
- Visual consistency
- File size optimization
- Font rendering quality

### Testing Agent

- Code coverage percentage
- Test execution speed
- Test reliability
- Edge case coverage

### Build Agent

- Build success rate
- Bundle size optimization
- Dependency management
- Cross-platform compatibility

### Documentation Agent

- Documentation completeness
- Example accuracy
- User feedback scores
- API clarity

---

*This agents file should be updated as the project evolves and new requirements emerge.*
