// This file is used only in the contract workflow after types are generated.
// It must not be included in regular app builds.

// Ensure generated OpenAPI types can be imported and referenced.
import type { paths } from '../../../packages/generated/schema';

// Simple type alias to force resolution
type _CheckPaths = paths;

// Example of drilling into a path type (compile-time only)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _LoansList = paths['/api/loans']['get'];
