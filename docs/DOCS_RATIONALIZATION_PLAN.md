# Documentation Rationalization Plan

## Current Issues

1. **Redundancy**: QUICK_START.md exists in both root and docs/
2. **Outdated**: Phase tracking docs (PHASE_1, PHASE_2) should be archived
3. **Temporary**: DEV_SERVER_RUNNING.md is a status file, not permanent documentation
4. **Incomplete**: TYPESCRIPT_SETUP_FIX.md and SERVER_SETUP.md are implementation-specific
5. **Organization**: Mix of user, developer, and temporary documentation

## Proposed Structure

```
docs/
├── README.md                    # Keep - Documentation index
├── USER_GUIDE.md               # Keep - End user documentation
├── REPORT_DEFINITIONS.md       # Keep - Report configuration reference
├── ARCHITECTURE.md             # Keep - Technical architecture
├── DEVELOPMENT.md              # Keep - Developer guide
├── MIGRATION_GUIDE.md          # Keep - Migration from hardcoded reports
├── CHANGELOG.md                # Move to root (standard location)
└── archive/                    # Archive folder for historical docs
    ├── README.md
    ├── PHASE_1_QUICK_WINS_COMPLETE.md  # Move here
    ├── PHASE_2_PROGRESS.md             # Move here
    ├── DENO_MIGRATION.md               # Move here (completed)
    ├── TYPESCRIPT_SETUP_FIX.md         # Move here (implementation detail)
    ├── SERVER_SETUP.md                 # Move here (implementation detail)
    ├── DEV_SERVER_RUNNING.md           # Delete (temporary status file)
    └── ... (existing archive files)
```

## Actions Required

### 1. Delete Temporary Files
- [ ] Delete `docs/DEV_SERVER_RUNNING.md` (temporary status file)
- [ ] Delete `docs/QUICK_START.md` (duplicate of root QUICK_START.md)

### 2. Move to Archive
- [ ] Move `docs/PHASE_1_QUICK_WINS_COMPLETE.md` → `docs/archive/`
- [ ] Move `docs/PHASE_2_PROGRESS.md` → `docs/archive/`
- [ ] Move `docs/DENO_MIGRATION.md` → `docs/archive/` (migration complete)
- [ ] Move `docs/TYPESCRIPT_SETUP_FIX.md` → `docs/archive/` (implementation detail)
- [ ] Move `docs/SERVER_SETUP.md` → `docs/archive/` (implementation detail)

### 3. Move to Root
- [ ] Move `docs/CHANGELOG.md` → `CHANGELOG.md` (standard location)
- [ ] Update all references to CHANGELOG.md in other docs

### 4. Update Documentation Index
- [ ] Update `docs/README.md` to reflect new structure
- [ ] Remove references to archived/deleted files
- [ ] Add note about archive folder

### 5. Update Cross-References
- [ ] Update links in README.md
- [ ] Update links in DEVELOPMENT.md
- [ ] Update links in USER_GUIDE.md
- [ ] Update links in ARCHITECTURE.md

## Rationale

### Keep in docs/
**USER_GUIDE.md**: Active user documentation  
**REPORT_DEFINITIONS.md**: Active configuration reference  
**ARCHITECTURE.md**: Active technical documentation  
**DEVELOPMENT.md**: Active developer guide  
**MIGRATION_GUIDE.md**: Still relevant for teams migrating  
**README.md**: Documentation index

### Move to Root
**CHANGELOG.md**: Standard location for changelogs (root of repo)

### Archive
**Phase tracking docs**: Historical progress tracking, no longer active  
**DENO_MIGRATION.md**: Migration complete, keep for reference  
**TYPESCRIPT_SETUP_FIX.md**: Implementation detail, not ongoing documentation  
**SERVER_SETUP.md**: Implementation detail, covered in DEVELOPMENT.md  

### Delete
**DEV_SERVER_RUNNING.md**: Temporary status file, not documentation  
**QUICK_START.md**: Duplicate of root file

## Benefits

1. **Clearer Structure**: Separate active docs from historical docs
2. **Reduced Confusion**: No duplicate files
3. **Better Maintenance**: Easier to find and update active documentation
4. **Standard Conventions**: CHANGELOG in root follows conventions
5. **Preserved History**: Archive keeps historical context

## Implementation Order

1. Delete temporary files (low risk)
2. Move to archive (preserves history)
3. Move CHANGELOG to root (update references)
4. Update documentation index
5. Update cross-references
