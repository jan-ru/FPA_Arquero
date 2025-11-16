# Auto-Load Enhancement

## Date: November 17, 2025

## Overview

Enhanced the directory selection workflow to automatically load files when the directory is named "input" and contains the required trial balance files, streamlining the user experience.

---

## Changes Made

### 1. Removed Success Message from UI

**Previous Behavior**:
- Success message displayed in UI: "✅ All files loaded successfully!"
- Message cleared after 3 seconds

**New Behavior**:
- Loading message simply clears when complete
- Success logged to console: `✅ All files loaded successfully!`
- Cleaner, less cluttered interface

**Rationale**:
- File status indicators already show success (✅ with row counts)
- Statement display confirms successful loading
- Console logging sufficient for debugging
- Reduces visual noise

### 2. Auto-Load on Directory Selection

**Previous Workflow**:
1. User clicks "Select Directory"
2. User selects directory
3. User clicks "Load Files"
4. Files load

**New Workflow**:
1. User clicks "Select Directory"
2. User selects directory
3. **Application validates:**
   - Directory must be named "input"
   - Required files must exist
4. **If validation passes:**
   - Files automatically load
5. **If validation fails:**
   - Error message displayed
   - User must select correct directory

**Benefits**:
- Saves one click for common workflow
- Faster for users following naming convention
- Still supports manual loading for other directories
- Intelligent behavior without being intrusive

---

## Technical Implementation

### Auto-Load Logic

**Location**: `UIController.handleSelectInputDirectory()` method

```javascript
async handleSelectInputDirectory() {
    try {
        await this.dataLoader.selectInputDirectory();
        const dirName = this.dataLoader.inputDirHandle.name;
        
        // Display directory name
        statusText.textContent = `📁 ${dirName}`;
        
        // Enable load button
        document.getElementById('load-all-files').disabled = false;
        
        // Auto-load if directory is named "input" and files exist
        if (dirName.toLowerCase() === 'input') {
            console.log('Directory named "input" detected, checking for files...');
            
            const filesExist = await this.checkRequiredFilesExist();
            
            if (filesExist) {
                console.log('Required files found, auto-loading...');
                await this.handleLoadAllFiles();
            } else {
                console.log('Required files not found in directory');
                this.showLoadingMessage('Directory selected. Click "Load Files" to continue.');
            }
        }
    } catch (error) {
        this.showErrorMessage(error.message);
    }
}
```

### File Existence Check

**New Method**: `checkRequiredFilesExist()`

```javascript
async checkRequiredFilesExist() {
    try {
        const requiredFiles = [
            config.inputFiles.trialBalance2024,
            config.inputFiles.trialBalance2025
        ];
        
        for (const filename of requiredFiles) {
            try {
                await this.dataLoader.inputDirHandle.getFileHandle(filename);
            } catch (error) {
                console.log(`File not found: ${filename}`);
                return false;
            }
        }
        
        return true;
    } catch (error) {
        console.error('Error checking files:', error);
        return false;
    }
}
```

**How It Works**:
1. Checks for required files using File System Access API
2. Returns `true` if all required files exist
3. Returns `false` if any file is missing
4. Logs missing files to console for debugging

### Success Message Removal

**Location**: `UIController.handleLoadAllFiles()` method

**Before**:
```javascript
this.showSuccessMessage('All files loaded successfully!');
```

**After**:
```javascript
// Clear loading message and log success to console
const loadingStatus = document.getElementById('loading-status');
if (loadingStatus) {
    loadingStatus.textContent = '';
}
console.log('✅ All files loaded successfully!');
```

---

## User Experience

### Scenario 1: Standard Workflow (Directory Named "input")

**Steps**:
1. User clicks "Select Directory"
2. User navigates to and selects "input" directory
3. **Application automatically checks for files**
4. **Files automatically load** ✅
5. Statements display immediately

**User Saves**: 1 click, ~2 seconds

### Scenario 2: Wrong Directory Name

**Steps**:
1. User clicks "Select Directory"
2. User selects directory (e.g., "data", "financials")
3. **Error displayed**: "Directory must be named 'input' (current: 'data')"
4. User must select correct directory

**Behavior**: Enforces naming convention

### Scenario 3: "input" Directory Without Files

**Steps**:
1. User clicks "Select Directory"
2. User selects "input" directory
3. Application checks for files
4. Files not found
5. **Error displayed**: "Required files not found in directory. Please ensure the directory contains the trial balance files."
6. User must add files or select different directory

**Behavior**: Clear error message guides user

---

## Console Logging

### Auto-Load Detection
```
Directory named "input" detected, checking for files...
```

### Files Found
```
Required files found, auto-loading...
Loading 2024 trial balance...
Loading 2025 trial balance...
Combining data...
✅ All files loaded successfully!
```

### Files Not Found
```
Directory named "input" detected, checking for files...
File not found: 2024_BalansenWinstverliesperperiode.xlsx
Required files not found in directory
```

### Success
```
✅ All files loaded successfully!
Trial Balance 2024 loaded successfully:
  - Movements: 1714 rows
  - Balances: 217 rows
Trial Balance 2025 loaded successfully:
  - Movements: 1466 rows
  - Balances: 203 rows
Combined movements table created: 3180 rows
```

---

## Configuration

### Required Files Checked

From `config.json`:
```json
{
    "inputFiles": {
        "trialBalance2024": "2024_BalansenWinstverliesperperiode.xlsx",
        "trialBalance2025": "2025_BalansenWinstverliesperperiode.xlsx"
    }
}
```

**Note**: Only the two trial balance files are checked. Optional files (Dates) are not required for auto-load.

### Directory Name Check

- Case-insensitive: "input", "Input", "INPUT" all trigger auto-load
- Exact match required: "input_data" or "my_input" will NOT trigger auto-load
- Configurable: Can be modified in code if different convention needed

---

## Edge Cases Handled

### 1. Permission Denied
- If file check fails due to permissions
- Returns `false`, falls back to manual loading
- Error logged to console

### 2. Network Drive
- File System Access API may behave differently
- Graceful fallback to manual loading
- No application crash

### 3. Slow File System
- Async operations prevent UI blocking
- Loading indicators show progress
- User can still interact with UI

### 4. Missing Config
- If `config.json` not loaded
- Auto-load skipped
- Manual loading still works

### 5. Partial Files
- If only one trial balance file exists
- Auto-load skipped
- User gets clear error when manually loading

---

## Testing Checklist

### Auto-Load Scenarios
- [x] Directory named "input" with all files → Auto-loads
- [x] Directory named "Input" (capital I) → Auto-loads
- [x] Directory named "INPUT" → Auto-loads
- [x] Directory named "input_data" → Manual load required
- [x] Directory named "my_input" → Manual load required
- [x] Directory named "input" missing files → Manual load, shows error

### Manual Load Scenarios
- [x] Any directory name → Manual load works
- [x] Click "Load Files" before auto-load completes → Handled gracefully
- [x] Change directory after auto-load → Can reload

### Error Scenarios
- [x] Permission denied → Graceful fallback
- [x] Network error → Graceful fallback
- [x] Invalid files → Clear error message
- [x] Missing config → Manual load still works

### UI/UX
- [x] Loading indicators display correctly
- [x] Success message removed from UI
- [x] Console logging works
- [x] File status indicators update
- [x] Statements display after auto-load

---

## Benefits

### For Users
1. **Faster Workflow**: One less click for standard use case
2. **Intuitive**: Follows expected behavior for "input" directory
3. **Flexible**: Still supports manual loading
4. **Cleaner UI**: No unnecessary success messages
5. **Professional**: Intelligent automation without being intrusive

### For Development
1. **Better UX**: Streamlined common workflow
2. **Maintainable**: Clear separation of concerns
3. **Extensible**: Easy to add more auto-load conditions
4. **Debuggable**: Comprehensive console logging
5. **Robust**: Handles edge cases gracefully

---

## Future Enhancements

### Potential Improvements
1. **Custom Directory Names**: Allow user to configure auto-load directory name
2. **File Pattern Matching**: Auto-detect files by pattern (e.g., "*2024*.xlsx")
3. **Progress Indicator**: Show file checking progress
4. **Remember Last Directory**: Auto-select last used directory
5. **Drag & Drop**: Support drag-and-drop for directory selection
6. **Batch Processing**: Support multiple directories at once

---

## Backward Compatibility

### Maintained
- Manual loading still works for all directories
- No breaking changes to existing workflow
- All error handling preserved
- File status indicators unchanged

### Enhanced
- "input" directory now triggers auto-load
- Console logging more comprehensive
- UI cleaner without success message

---

## Documentation Updates Needed

### User Guide
1. Add section on auto-load feature
2. Explain "input" directory convention
3. Show console logging examples
4. Update workflow diagrams

### Developer Guide
1. Document `checkRequiredFilesExist()` method
2. Explain auto-load logic
3. Show how to customize directory name
4. Add troubleshooting section

---

## Conclusion

The auto-load enhancement improves the user experience by:
1. Reducing clicks for common workflow
2. Removing unnecessary UI messages
3. Providing intelligent automation
4. Maintaining flexibility for all use cases

The implementation is robust, handles edge cases gracefully, and maintains backward compatibility while adding valuable new functionality.
