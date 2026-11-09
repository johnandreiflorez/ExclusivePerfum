# CODEBASE ARCHITECTURE & QUALITY STANDARDS

## 1. TYPESCRIPT STANDARDS

### A. Type Guards over Type Assertions (`as`)
- **Rule:** Never force types using `as`. Validate payloads at runtime.

```typescript
// ❌ BAD (DO NOT GENERATE)
const user = response.data as UserProfile;

// ✅ GOOD (TARGET PATTERN)
function isUserProfile(data: unknown): data is UserProfile {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'email' in data
  );
}

if (!isUserProfile(response.data)) {
  throw new Error("Invalid UserProfile structure received");
}
// 'response.data' is now safely typed as UserProfile
```
### B. Discriminated Unions for Complex Async States
```typescript
// ✅ GOOD (TARGET PATTERN)
type FetchState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };
```
## 2. STATE MANAGEMENT & API PROTOCOL (JSON-RPC)
### A. Server State with TanStack Query
- Rule: All external API data must be fetched using @tanstack/react-query.

```TypeScript
// ❌ BAD (DO NOT GENERATE)
// Fetching server state inside React Context or local useEffect for global sharing
const [data, setData] = useState([]);
useEffect(() => {
  fetch('/api/items').then(r => r.json()).then(setData);
}, []);

// ✅ GOOD (TARGET PATTERN)
const { data, isLoading } = useQuery({
  queryKey: ['items'],
  queryFn: () => callRpcMethod('get_items', {}),
});
```
### B. JSON-RPC Handling & data: null Validation
```TypeScript
// ✅ GOOD (TARGET PATTERN)
async function callRpcMethod<T>(method: string, params: Record<string, any>): Promise<T> {
  const payload = { jsonrpc: '2.0', method, params, id: Date.now() };
  const res = await fetch('/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const json = await res.json();

  if (json.error) {
    throw new Error(`RPC Error [${json.error.code}]: ${json.error.message}`);
  }
  
  // Critical Check: data: null indicates execution/DB crash
  if (json.result?.data === null) {
    throw new Error('Database Execution Exception (data is null)');
  }

  return json.result.data;
}
```
## 3. PERFORMANCE & HOOKS
### A. Effect Cleanup
```TypeScript
// ❌ BAD (DO NOT GENERATE)
useEffect(() => {
  window.addEventListener('resize', handleResize);
}); // Missing cleanup & missing dependencies array

// ✅ GOOD (TARGET PATTERN)
useEffect(() => {
  const handleResize = () => setWidth(window.innerWidth);
  window.addEventListener('resize', handleResize);
  
  return () => window.removeEventListener('resize', handleResize);
}, []);
```
## 4. STYLING & DESIGN TOKENS
### A. No Hardcoded Values
```TypeScript
// ❌ BAD (DO NOT GENERATE)
<div className="bg-[#1e293b] text-[#ffffff] p-[13px]">
  <button style={{ backgroundColor: '#0052cc' }}>Save</button>
</div>

// ✅ GOOD (TARGET PATTERN)
<div className="bg-surface-primary text-text-main p-spacing-md">
  <Button variant="primary">{t('common.save')}</Button>
</div>
```
## 5. TESTING E2E (SCREENPLAY PATTERN)
### A. Screenplay Architecture over Monolithic POM
```TypeScript
// ✅ GOOD (TARGET PATTERN)
// Define tasks as modular, reusable business actions
export const CreateWorkOrder = {
  withTitle: (title: string) => async ({ page }: { page: Page }) => {
    await page.getByRole('button', { name: 'New Work Order' }).click();
    await page.getByLabel('Title').fill(title);
    await page.getByRole('button', { name: 'Save' }).click();
  }
};
```