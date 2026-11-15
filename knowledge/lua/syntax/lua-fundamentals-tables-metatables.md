---
id: "55555555-5555-5555-5555-555555555555"
title: "Lua 5.4 Language Fundamentals, Tables, and Metatables"
ecosystem: "lua"
category: "syntax"
versions: ["5.4", "5.3", "5.1"]
sources:
  - url: "https://www.lua.org/manual/5.4/"
    title: "Lua 5.4 Reference Manual"
    ecosystem: "lua"
    versionApplicability: "5.4"
    retrieved: "2026-11-15T00:00:00Z"
    license: "MIT"
    verificationState: "official"
  - url: "https://www.lua.org/manual/5.4/manual.html#2.4"
    title: "Lua 5.4 - Tables"
    ecosystem: "lua"
    versionApplicability: "5.4"
    retrieved: "2026-11-15T00:00:00Z"
    license: "MIT"
    verificationState: "official"
  - url: "https://www.lua.org/manual/5.4/manual.html#2.4"
    title: "Lua 5.4 - Metatables"
    ecosystem: "lua"
    versionApplicability: "5.4"
    retrieved: "2026-11-15T00:00:00Z"
    license: "MIT"
    verificationState: "official"
  - url: "https://www.lua.org/manual/5.3/manual.html"
    title: "Lua 5.3 Reference Manual"
    ecosystem: "lua"
    versionApplicability: "5.3"
    retrieved: "2026-11-15T00:00:00Z"
    license: "MIT"
    verificationState: "official"
  - url: "https://www.lua.org/manual/5.1/manual.html"
    title: "Lua 5.1 Reference Manual"
    ecosystem: "lua"
    versionApplicability: "5.1"
    retrieved: "2026-11-15T00:00:00Z"
    license: "MIT"
    verificationState: "official"
status: "verified"
lastVerified: "2026-11-15T00:00:00Z"
tags: ["lua", "syntax", "tables", "metatables", "metamethods", "5.4", "5.3", "5.1"]
checksum: "sha256:placeholder"
---

# Lua 5.4 Language Fundamentals, Tables, and Metatables

## Explanation

Lua is a lightweight, embeddable scripting language with a simple syntax and powerful data structuring mechanisms. The core data structure is the **table** — an associative array that can be used as arrays, dictionaries, sets, records, and objects.

**Key concepts:**
- **Tables**: The only composite data structure; hash map + array hybrid
- **Metatables**: Tables that define behavior for other tables (operator overloading, inheritance, etc.)
- **Metamethods**: Special keys in metatables (`__index`, `__newindex`, `__add`, `__call`, etc.)
- **Lexical scoping**: Variables are local by default; `local` keyword for block scope
- **First-class functions**: Functions are values; closures capture upvalues
- **Coroutines**: Cooperative multitasking with `coroutine.create`, `resume`, `yield`

## Patterns

### Basic Syntax and Variables

Context: Variable declarations and basic types
```lua
-- Comments
--[[ Multi-line comment ]]

-- Variables (global by default, use local)
local x = 10          -- local variable
local name = "Lua"    -- string
local pi = 3.14159    -- number (float64 in 5.3+)
local flag = true     -- boolean
local nothing = nil   -- nil (absence of value)

-- Multiple assignment
local a, b, c = 1, 2, 3
local x, y = y, x     -- swap

-- Type checking
print(type(x))        -- "number"
print(type(name))     -- "string"
print(type(flag))     -- "boolean"
print(type(nothing))  -- "nil"
print(type({}))       -- "table"
print(type(print))    -- "function"
```

### Control Structures

Context: Conditional and loop constructs
```lua
-- If-then-else
if x > 0 then
    print("positive")
elseif x < 0 then
    print("negative")
else
    print("zero")
end

-- While loop
local i = 1
while i <= 10 do
    print(i)
    i = i + 1
end

-- Repeat-until (executes at least once)
local i = 1
repeat
    print(i)
    i = i + 1
until i > 10

-- Numeric for loop
for i = 1, 10, 2 do  -- start, stop, step
    print(i)
end

-- Generic for loop (iterators)
local t = {"a", "b", "c"}
for i, v in ipairs(t) do
    print(i, v)
end

for k, v in pairs(t) do
    print(k, v)
end
```

### Functions

Context: Function declarations, closures, and variadic functions
```lua
-- Function declaration
local function add(a, b)
    return a + b
end

-- Anonymous function
local multiply = function(a, b)
    return a * b
end

-- Multiple return values
local function divmod(a, b)
    return math.floor(a / b), a % b
end
local q, r = divmod(10, 3)  -- q=3, r=1

-- Variadic functions
local function sum(...)
    local total = 0
    for _, v in ipairs({...}) do
        total = total + v
    end
    return total
end
print(sum(1, 2, 3, 4))  -- 10

-- Closures (capture upvalues)
local function makeCounter()
    local count = 0
    return function()
        count = count + 1
        return count
    end
end
local counter = makeCounter()
print(counter())  -- 1
print(counter())  -- 2
```

### Tables as Arrays (Sequences)

Context: Using tables as 1-indexed arrays
```lua
-- Array-like table (1-indexed)
local arr = {10, 20, 30, 40}
print(arr[1])   -- 10
print(#arr)     -- 4 (length operator)

-- Append
table.insert(arr, 50)
arr[#arr + 1] = 60  -- manual append

-- Iterate in order
for i = 1, #arr do
    print(arr[i])
end

-- ipairs iterates sequential part only
for i, v in ipairs(arr) do
    print(i, v)
end

-- Remove
table.remove(arr, 2)  -- removes index 2, shifts down
```

### Tables as Dictionaries (Hash Maps)

Context: Using tables as key-value stores
```lua
-- Dictionary-like table
local dict = {
    name = "Lua",
    version = "5.4",
    released = 2020
}

-- Access
print(dict.name)        -- "Lua"
print(dict["version"])  -- "5.4"

-- Add/modify
dict.author = "Roberto Ierusalimschy"
dict["version"] = "5.4.6"

-- Delete
dict.released = nil

-- Iterate (unordered)
for k, v in pairs(dict) do
    print(k, v)
end

-- Check existence
if dict.author then
    print("Has author")
end
```

### Tables as Mixed Structures

Context: Tables with both array and hash parts
```lua
-- Mixed array + hash parts
local t = {
    1, 2, 3,           -- array part (indices 1,2,3)
    name = "mixed",    -- hash part
    [10] = "ten",      -- explicit index in hash part
    ["key with space"] = "value"
}

print(#t)           -- 3 (only counts sequential from 1)
print(t[10])        -- "ten"
print(t.name)       -- "mixed"

-- pairs iterates ALL keys (array + hash)
for k, v in pairs(t) do
    print(k, v)
end
```

### Metatables and Metamethods

Context: Defining custom behavior for tables
```lua
-- Metatable defines behavior for a table
local vector = {x = 0, y = 0}
local vector_mt = {}

-- __index: called when key not found in table
vector_mt.__index = function(t, k)
    if k == "length" then
        return math.sqrt(t.x * t.x + t.y * t.y)
    end
    return nil
end

-- __newindex: called when setting new key
vector_mt.__newindex = function(t, k, v)
    if k == "x" or k == "y" then
        rawset(t, k, v)  -- bypass metamethod
    else
        error("Cannot set " .. k)
    end
end

-- __add: operator overloading for +
vector_mt.__add = function(a, b)
    return setmetatable({x = a.x + b.x, y = a.y + b.y}, vector_mt)
end

-- __tostring: string representation
vector_mt.__tostring = function(v)
    return string.format("Vector(%.2f, %.2f)", v.x, v.y)
end

-- __call: make table callable
vector_mt.__call = function(v, scalar)
    return setmetatable({x = v.x * scalar, y = v.y * scalar}, vector_mt)
end

setmetatable(vector, vector_mt)

print(vector.length)      -- 0 (via __index)
print(vector + {x=3, y=4}) -- Vector(3.00, 4.00) (via __add)
print(vector)             -- Vector(0.00, 0.00) (via __tostring)
print(vector(2))          -- Vector(0.00, 0.00) (via __call)
```

### Object-Oriented Patterns with Metatables

Context: Implementing classes and inheritance with metatables
```lua
-- Class-like pattern
local Animal = {}
Animal.__index = Animal

function Animal:new(name)
    local self = setmetatable({name = name}, Animal)
    return self
end

function Animal:speak()
    print(self.name .. " makes a sound")
end

-- Inheritance
local Dog = setmetatable({}, {__index = Animal})
Dog.__index = Dog

function Dog:new(name, breed)
    local self = Animal.new(self, name)
    self.breed = breed
    return setmetatable(self, Dog)
end

function Dog:speak()
    print(self.name .. " barks (" .. self.breed .. ")")
end

-- Usage
local dog = Dog:new("Rex", "Labrador")
dog:speak()  -- Rex barks (Labrador)

-- Alternative: Using __call for constructor
local Cat = {}
Cat.__index = Cat

setmetatable(Cat, {
    __call = function(cls, name)
        return setmetatable({name = name}, Cat)
    end
})

function Cat:speak()
    print(self.name .. " meows")
end

local cat = Cat("Whiskers")  -- Cat.__call invoked
cat:speak()
```

### Metamethod Reference (Complete)

Context: Complete list of all metamethods
```lua
local mt = {}

-- Arithmetic
mt.__add = function(a, b) end      -- a + b
mt.__sub = function(a, b) end      -- a - b
mt.__mul = function(a, b) end      -- a * b
mt.__div = function(a, b) end      -- a / b
mt.__mod = function(a, b) end      -- a % b
mt.__pow = function(a, b) end      -- a ^ b
mt.__unm = function(a) end         -- -a
mt.__idiv = function(a, b) end     -- a // b (5.3+)
mt.__band = function(a, b) end     -- a & b (5.3+)
mt.__bor = function(a, b) end      -- a | b (5.3+)
mt.__bxor = function(a, b) end     -- a ~ b (5.3+)
mt.__bnot = function(a) end        -- ~a (5.3+)
mt.__shl = function(a, b) end      -- a << b (5.3+)
mt.__shr = function(a, b) end      -- a >> b (5.3+)

-- Comparison
mt.__eq = function(a, b) end       -- a == b
mt.__lt = function(a, b) end       -- a < b
mt.__le = function(a, b) end       -- a <= b

-- Table access
mt.__index = function(t, k) end    -- t[k] (read)
mt.__newindex = function(t, k, v) end  -- t[k] = v (write)

-- Other
mt.__call = function(t, ...) end   -- t(...)
mt.__tostring = function(t) end    -- tostring(t)
mt.__concat = function(a, b) end   -- a .. b
mt.__len = function(t) end         -- #t (5.2+)
mt.__pairs = function(t) end       -- pairs(t) (5.2+)
mt.__ipairs = function(t) end      -- ipairs(t) (5.2+)
mt.__gc = function(t) end          -- garbage collection (userdata only)
mt.__close = function(t) end       -- to-be-closed variables (5.4+)
mt.__mode = "k" or "v" or "kv"     -- weak table keys/values
```

## Examples

### Configuration File Parser

Runnable: false
```lua
-- config.lua - Simple config parser
local M = {}

function M.load(filename)
    local file = io.open(filename, "r")
    if not file then
        return nil, "Cannot open file"
    end
    
    local content = file:read("*a")
    file:close()
    
    -- Simple key=value parser
    local config = {}
    for line in content:gmatch("[^\r\n]+") do
        line = line:match("^%s*(.-)%s*$")  -- trim
        if line ~= "" and not line:match("^#") then
            local key, value = line:match("^([^=]+)=(.*)$")
            if key then
                key = key:match("^%s*(.-)%s*$")
                value = value:match("^%s*(.-)%s*$")
                -- Type inference
                if value == "true" then value = true
                elseif value == "false" then value = false
                elseif value:match("^%d+$") then value = tonumber(value)
                elseif value:match("^%d+%.%d+$") then value = tonumber(value)
                end
                config[key] = value
            end
        end
    end
    
    return config
end

function M.save(filename, config)
    local file = io.open(filename, "w")
    if not file then
        return nil, "Cannot write file"
    end
    
    for k, v in pairs(config) do
        local val
        if type(v) == "boolean" then
            val = v and "true" or "false"
        elseif type(v) == "number" then
            val = tostring(v)
        else
            val = '"' .. tostring(v) .. '"'
        end
        file:write(k .. " = " .. val .. "\n")
    end
    
    file:close()
    return true
end

return M
```

### Module Pattern with Private State

Runnable: false
```lua
-- counter.lua - Module with private state
local M = {}

-- Private state (upvalue)
local count = 0
local history = {}

function M.increment()
    count = count + 1
    table.insert(history, {action = "inc", value = count, time = os.time()})
    return count
end

function M.decrement()
    count = count - 1
    table.insert(history, {action = "dec", value = count, time = os.time()})
    return count
end

function M.get()
    return count
end

function M.getHistory()
    return history
end

function M.reset()
    count = 0
    history = {}
end

return M
```

### Weak Tables for Caches

Runnable: false
```lua
-- cache.lua - Weak-value cache
local M = {}

-- Weak values: entries removed when value is garbage collected
local cache = setmetatable({}, {__mode = "v"})

function M.get(key, factory)
    local value = cache[key]
    if value == nil then
        value = factory()
        cache[key] = value
    end
    return value
end

function M.clear()
    for k in pairs(cache) do
        cache[k] = nil
    end
end

return M
```

## Mistakes

### Using Length Operator on Non-Sequential Tables
Problem: Returns wrong length
Solution: Use `#` only on sequences (1..n without holes); use custom counter for sparse
Severity: error

### Forgetting local
Problem: Creates global variable, pollutes namespace
Solution: Always use `local` for variables and functions
Severity: warning

### pairs vs ipairs Confusion
Problem: `ipairs` stops at first nil; `pairs` iterates all
Solution: Use `ipairs` for arrays, `pairs` for dictionaries
Severity: warning

### Modifying Table During Iteration
Problem: Undefined behavior, skipped elements
Solution: Collect keys first, then iterate
Severity: error

### Metatable Not Set with setmetatable
Problem: Metamethods not triggered
Solution: Always call `setmetatable(t, mt)`
Severity: error

### Using __index as Table Instead of Function
Problem: Cannot compute dynamic values
Solution: Use function for dynamic; table for static delegation
Severity: warning

### Circular References in __index
Problem: Infinite loop, stack overflow
Solution: Ensure delegation chain terminates
Severity: error

### Not Using rawset/rawget in Metamethods
Problem: Infinite recursion
Solution: Use `rawset(t, k, v)` and `rawget(t, k)` inside metamethods
Severity: error

### == on Tables with __eq
Problem: Only works if both have same metatable
Solution: Ensure both operands share metatable
Severity: warning

### #t in 5.1 vs 5.2+
Problem: Behavior differs for __len
Solution: In 5.1, `#` ignores `__len`; use `__len` only in 5.2+
Severity: warning

## Compatibility

### __len metamethod
Introduced: 5.2
Notes: 5.1: # only works on arrays

### __pairs/__ipairs metamethod
Introduced: 5.2
Notes: Custom iteration

### Bitwise operators
Introduced: 5.3
Notes: &, |, ~, <<, >>, //

### Integers (subtype)
Introduced: 5.3
Notes: 64-bit integers

### __close metamethod
Introduced: 5.4
Notes: To-be-closed variables

### const variables
Introduced: 5.4
Notes: <const> attribute

### to-be-closed variables
Introduced: 5.4
Notes: <close> attribute

### utf8 library
Introduced: 5.3
Notes: UTF-8 support

### table.pack/unpack
Introduced: 5.2
Notes: Variadic handling

### math.mininteger/maxinteger
Introduced: 5.3
Notes: Integer limits

### string.pack/unpack
Introduced: 5.3
Notes: Binary data

## Performance

### Table creation
Impact: medium
Description: Frequent table allocation in hot paths
Mitigation: Reuse tables when possible; avoid creating in hot loops

### String concatenation
Impact: medium
Description: Repeated concatenation creates many intermediate strings
Mitigation: Use `table.concat` for multiple concatenations

### Global access
Impact: low
Description: Global variable lookup is slower than local
Mitigation: Cache globals as locals (`local print = print`)

### Function calls
Impact: low
Description: Function call overhead in tight loops
Mitigation: Inline small functions; avoid deep call stacks in hot paths

### Metamethod overhead
Impact: medium
Description: Each metamethod call has overhead
Mitigation: Avoid in performance-critical code

### Weak tables
Impact: low
Description: GC overhead for weak references
Mitigation: Use for caches; values can be GC'd; monitor memory

## Debugging

### attempt to index nil value
Cause: Variable is nil
Diagnosis: Check variable initialization
Resolution: Ensure variable assigned before use
Tools: print(var)

### attempt to call a nil value
Cause: Function not defined
Diagnosis: Check spelling, scope
Resolution: Define function; check `local`
Tools: print(type(fn))

### loop in gettable
Cause: Circular __index
Diagnosis: Check metatable chain
Resolution: Break cycle; ensure termination
Tools: debug.traceback()

### stack overflow
Cause: Infinite recursion
Diagnosis: Check metamethods, recursive functions
Resolution: Add base case; use `rawget`/`rawset`
Tools: debug.traceback()

### Table length wrong
Cause: Holes in array
Diagnosis: `#t` stops at first nil
Resolution: Use `table.maxn` (5.1) or custom counter
Tools: #t, next(t)

### Metamethod not called
Cause: Wrong metatable or key exists
Diagnosis: Metamethods only for absent keys
Resolution: Use `rawget` to check; ensure `setmetatable`
Tools: getmetatable(t)

### Global variable leak
Cause: Missing `local`
Diagnosis: Check `_G` for unexpected keys
Resolution: Use `local`; run `luacheck`
Tools: luacheck

## References

- [Lua 5.4 Reference Manual](https://www.lua.org/manual/5.4/) (official)
- [Lua 5.3 Reference Manual](https://www.lua.org/manual/5.3/) (official)
- [Lua 5.1 Reference Manual](https://www.lua.org/manual/5.1/) (official)
- [Programming in Lua (PiL) 4th Ed.](https://www.lua.org/pil/) (official book)
- [Lua Users Wiki](http://lua-users.org/wiki/) (community)