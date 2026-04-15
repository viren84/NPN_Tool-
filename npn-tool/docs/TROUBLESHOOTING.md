# Troubleshooting Guide — NPN Filing Tool

> Last updated: 2026-04-13
> For: Users, developers, and system administrators

---

## 1. Installation & Setup Issues

### "npm install" fails
| Symptom | Cause | Solution |
|---|---|---|
| `EACCES: permission denied` | No write permission to node_modules | Run terminal as Administrator |
| `npm ERR! code ERESOLVE` | Dependency version conflict | Try `npm install --legacy-peer-deps` |
| `node-gyp` errors | Native module build failure | Install Windows Build Tools: `npm install --global windows-build-tools` |
| Very slow install | Large node_modules | Normal — 500+ packages. Wait 2-5 minutes. |

### "npx prisma generate" fails
| Symptom | Cause | Solution |
|---|---|---|
| `Cannot find module '@prisma/client'` | Prisma client not generated | Run `npx prisma generate` |
| `Error: Schema validation error` | Invalid schema.prisma | Check `prisma/schema.prisma` for syntax errors |
| `Error: P1001 Can't reach database` | SQLite file locked | Close any other app using dev.db (Prisma Studio, DB browser) |

### "npx prisma migrate dev" fails
| Symptom | Cause | Solution |
|---|---|---|
| `Error: Migration already applied` | Migration exists but schema changed | Run `npx prisma migrate reset` (WARNING: destroys data) |
| `Error: SQLite database is locked` | Another process has dev.db open | Close all connections to dev.db |
| `Error creating shadow database` | Prisma needs temp db for diff | Ensure disk space available |

---

## 2. Application Won't Start

### "npm run dev" — server doesn't start
| Symptom | Cause | Solution |
|---|---|---|
| `Port 3000 is already in use` | Another process on port 3000 | Kill it: `taskkill /f /pid $(netstat -ano \| findstr :3000)` or use Task Manager |
| `Module not found` errors | Missing dependencies | Run `npm install` and `npx prisma generate` |
| Next.js compilation errors | Code syntax error | Check the error message — it shows the file and line |
| Blank page at localhost:3000 | Server still starting | Wait 5-10 seconds, then refresh |

### Electron app won't launch
| Symptom | Cause | Solution |
|---|---|---|
| White screen | Next.js hasn't started yet | Wait longer, or check console for errors |
| "Cannot GET /" | Next.js build missing | Run `npm run build` first, then `npm run electron:start` |
| Window opens then closes | Crash on startup | Run `npm run electron:dev` in terminal to see error output |
| "electron is not recognized" | Not installed | Run `npm install` to get devDependencies |

---

## 3. Authentication Issues

### Can't log in
| Symptom | Cause | Solution |
|---|---|---|
| "Invalid credentials" | Wrong username/password | Check caps lock. Passwords are case-sensitive. |
| No "Register" option | First user already created | Ask existing admin to create your account |
| Session expired silently | 30-day session cookie expired | Log in again. No data is lost. |
| "Unauthorized" on every page | Session cookie not set | Clear cookies, log in again. Check if browser blocks httpOnly cookies. |

### Role/permission issues
| Symptom | Cause | Solution |
|---|---|---|
| "Forbidden" on create/edit | You're a **viewer** | Ask admin to upgrade your role to **editor** |
| Can't access Settings | You're not **admin** | Only admin can access Settings. Ask admin. |
| Can't delete licences | You're not **editor** or **admin** | Ask admin to upgrade your role |
| First user isn't admin | Bug in registration | Check `src/app/api/auth/register/route.ts` — first user should always be admin |

---

## 4. PDF Import Issues

### PDF upload fails
| Symptom | Cause | Solution |
|---|---|---|
| "File too large" | Over 20MB limit | Compress the PDF or split into smaller files |
| "Unreadable PDF" (422) | PDF is scanned image, not text | Use OCR software first, then re-upload |
| "Claude API key not set" | No API key in Settings | Admin: go to Settings → enter Claude API key |
| Low confidence score | PDF format unusual | Check extracted data carefully. Manual correction may be needed. |
| Duplicate detected | Same NPN already exists | Intentional — prevents double-import. Check existing licences first. |

### Extraction quality issues
| Symptom | Cause | Solution |
|---|---|---|
| Missing ingredients | PDF text extraction incomplete | Check if PDF is text-based (not scanned) |
| Wrong NPN number | Claude misread the document | Manually correct after import |
| Missing company info | Not in the PDF | Add manually or sync from LNHPD |

---

## 5. LNHPD Sync Issues

### Sync fails or returns empty data
| Symptom | Cause | Solution |
|---|---|---|
| "Not found in LNHPD" | Product too new or cancelled | Health Canada may not have it yet. Wait or enter manually. |
| All licences skipped | No licenceNumber on records | Import licences first (PDF or manual) with NPN numbers |
| Timeout during bulk sync | HC API slow | Wait and retry. The 300ms throttle prevents overload. |
| Missing ingredients after sync | normalize() issue | Check console for `[LNHPD]` warnings. HC may have returned unexpected format. |
| applicationClass is empty | submissionType not in LNHPD | Class derivation only works when HC returns sub_submission_type_desc |

### HC API is down
| Symptom | Cause | Solution |
|---|---|---|
| All syncs return errors | Health Canada API outage | Wait and retry later. Check https://health-products.canada.ca status. |
| Partial data returned | API returning errors for some endpoints | Re-run sync — idempotent, safe to run multiple times |

---

## 6. Document Generation Issues

### Generation fails
| Symptom | Cause | Solution |
|---|---|---|
| "Company profile not set" | CompanyProfile not filled out | Go to Company page → fill in all fields |
| "Generate English label first" | French label requires English first | Generate `label_en` before `label_fr` |
| "Claude API error" | API key invalid or quota exceeded | Check API key in Settings. Check usage at console.anthropic.com |
| Generation takes too long | Claude AI processing | Wait up to 30 seconds. Large documents take longer. |
| Empty content generated | AI returned nothing | Regenerate. Check that application has ingredients and claims filled in. |

### Quality issues
| Symptom | Cause | Solution |
|---|---|---|
| Claims missing from label | No claims added to application | Go to Tab 4 (Claims) → add claims before generating |
| Ingredients incorrect | Wrong data in Tab 2 | Fix ingredients in Tab 2, then regenerate |
| French translation poor | AI translation limitations | Review and manually correct. Future improvement: dedicated FR generator. |

---

## 7. Export Issues

### CSV/Excel export problems
| Symptom | Cause | Solution |
|---|---|---|
| CSV opens garbled in Excel | Encoding issue | Open Excel first → Data → From Text/CSV → select UTF-8 |
| Excel file won't open | Corrupted generation | Re-export. Check for special characters in product names. |
| Missing columns in CSV | Expected — CSV has 55 columns | Some columns may be empty if data not entered |
| Export button doesn't respond | JavaScript error | Open browser console (F12) → check for errors |

### Application export problems
| Symptom | Cause | Solution |
|---|---|---|
| Export path not set | AppSettings.exportPath empty | Admin: set export path in Settings |
| "No documents to export" | No documents generated | Generate documents first (Tab 7) before exporting |
| Files not appearing | Check export folder | Look in the configured export path or default `output/` folder |

---

## 8. Database Issues

### Database corrupted
| Symptom | Cause | Solution |
|---|---|---|
| "SQLITE_CORRUPT" | Database file damaged | Restore from backup: `copy backup.db prisma/dev.db` |
| "database is locked" | Multiple processes accessing | Close all apps using dev.db. Kill orphan node processes. |
| Missing data after update | Migration issue | Check `npx prisma migrate status`. May need manual intervention. |

### Database too large
| Symptom | Cause | Solution |
|---|---|---|
| Slow queries | Large ActivityLog/AuditLog tables | These grow over time. Consider archiving old records. |
| Disk space low | Many attachments + database | Clean old/unused files from `data/attachments/` |

### How to Reset Database (LAST RESORT)
```bash
# WARNING: This DESTROYS ALL DATA!
npx prisma migrate reset
# Then register a new admin user and re-import data
```

---

## 9. Claude AI Issues

### API errors
| Symptom | Cause | Solution |
|---|---|---|
| "Invalid API key" | Key is wrong or expired | Get a new key from console.anthropic.com → update in Settings |
| "Rate limit exceeded" | Too many requests | Wait a few minutes, then retry |
| "Insufficient funds" | API credit depleted | Add credits at console.anthropic.com → Billing |
| "Model not found" | Wrong model name | Tool uses `claude-sonnet-4-6`. Check `src/lib/claude.ts`. |
| "Request too large" | PDF text too long | Split large PDFs or truncate before sending to Claude |

---

## 10. Electron-Specific Issues

| Symptom | Cause | Solution |
|---|---|---|
| "App was made for an older version" | Electron version mismatch | Reinstall with latest NSIS installer |
| Slow performance | Chromium memory usage | Close unused tabs/windows. Restart app. |
| Can't copy/paste | Electron keyboard shortcut conflict | Use right-click context menu instead |
| Print doesn't work | Electron print handling | Export as PDF/HTML and print from file manager |
| File dialog doesn't open | Electron sandboxing | Check file dialog permissions in electron.js |

---

## 11. Known Limitations

| Limitation | Impact | Workaround |
|---|---|---|
| No offline AI features | PDF import and doc generation need internet | Use manual entry when offline |
| No auto-save | Changes lost if browser/app crashes | Save frequently using form submit buttons |
| No undo/redo | Accidental changes can't be undone | Check AuditLog for before/after values |
| No concurrent editing | Two users editing same record = last write wins | Coordinate who edits what |
| No mobile support | Desktop only (Electron) | Use the web interface on tablet at localhost:3000 |
| Dark Reader hydration warnings | Visual glitch with Dark Reader extension | Disable Dark Reader or ignore warnings |

---

## 12. Getting Help

### Self-Help
1. Check this troubleshooting guide
2. Check console output (F12 in browser, or terminal)
3. Check `docs/` folder for detailed documentation
4. Run `/sutradhaar-report` in Claude Code for system status

### Escalation
1. **Developer issues** → Check `docs/ONBOARDING.md` and `docs/ARCHITECTURE.md`
2. **Security issues** → Check `docs/SECURITY_CHECKLIST.md`
3. **Database issues** → Check `docs/DATABASE_SCHEMA.md`
4. **API issues** → Check `docs/API_REFERENCE.md`
5. **Regulatory questions** → Contact Dr. Naresh (external compliance reviewer)
6. **System admin issues** → Check `docs/SYSADMIN_GUIDE.md`
