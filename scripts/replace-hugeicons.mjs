/**
 * Script to replace @hugeicons/react and @hugeicons/core-free-icons with lucide-react
 * Run: node scripts/replace-hugeicons.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

// HugeIcons icon name → Lucide icon name mapping
const ICON_MAP = {
  Add01Icon: 'Plus',
  AlertCircleIcon: 'AlertCircle',
  AlignBoxMiddleRightIcon: 'AlignRight',
  AlignBoxTopLeftIcon: 'AlignLeft',
  AnalyticsUpIcon: 'TrendingUp',
  ArrowDown01Icon: 'ChevronDown',
  ArrowLeft01Icon: 'ArrowLeft',
  ArrowRight01Icon: 'ArrowRight',
  ArrowTurnDownIcon: 'CornerDownLeft',
  ArrowUp01Icon: 'ChevronUp',
  ArrowUpRight01Icon: 'ArrowUpRight',
  AttachmentIcon: 'Paperclip',
  BarChartIcon: 'BarChart2',
  BookOpen01Icon: 'BookOpen',
  BrokenBoneIcon: 'Activity',
  BulbIcon: 'Lightbulb',
  Calendar01Icon: 'Calendar',
  Call02Icon: 'Phone',
  Camera01Icon: 'Camera',
  Cancel01Icon: 'X',
  CancelCircleIcon: 'XCircle',
  CheckmarkCircle01Icon: 'CheckCircle2',
  CheckmarkSquare01Icon: 'CheckSquare',
  CircleIcon: 'Circle',
  ClipboardIcon: 'Clipboard',
  Clock01Icon: 'Clock',
  CloudIcon: 'Cloud',
  CodeIcon: 'Code',
  ColorPickerIcon: 'Palette',
  CompassIcon: 'Compass',
  ComputerIcon: 'Monitor',
  CreditCardIcon: 'CreditCard',
  DatabaseIcon: 'Database',
  DashboardCircleIcon: 'LayoutDashboard',
  Delete02Icon: 'Trash2',
  DeleteColumnIcon: 'Columns2',
  Download01Icon: 'Download',
  DropletIcon: 'Droplet',
  Edit02Icon: 'Pencil',
  Facebook01Icon: 'Facebook',
  FileAttachmentIcon: 'FileText',
  FloppyDiskIcon: 'Save',
  GithubIcon: 'Github',
  GlobeIcon: 'Globe',
  HardDriveIcon: 'HardDrive',
  HelpCircleIcon: 'HelpCircle',
  Image01Icon: 'ImageIcon',
  InformationCircleIcon: 'Info',
  InstagramIcon: 'Instagram',
  Key01Icon: 'Key',
  Layers01Icon: 'Layers',
  Layout01Icon: 'Layout',
  Linkedin01Icon: 'Linkedin',
  LinkSquare01Icon: 'ExternalLink',
  Link02Icon: 'Link',
  Loading02Icon: 'Loader2',
  Location01Icon: 'MapPin',
  LockIcon: 'Lock',
  Logout01Icon: 'LogOut',
  Mail01Icon: 'Mail',
  Menu01Icon: 'Menu',
  Message01Icon: 'MessageSquare',
  Mic01Icon: 'Mic',
  MoonIcon: 'Moon',
  Mortarboard01Icon: 'GraduationCap',
  MusicNote01Icon: 'Music',
  Notification01Icon: 'Bell',
  PackageIcon: 'Package',
  Plug01Icon: 'Plug',
  Refresh01Icon: 'RefreshCw',
  Search01Icon: 'Search',
  SentIcon: 'Send',
  Settings01Icon: 'Settings',
  Shield01Icon: 'Shield',
  ShoppingCart01Icon: 'ShoppingCart',
  SignatureIcon: 'PenLine',
  SlackIcon: 'Slack',
  SmartPhone01Icon: 'Smartphone',
  SquareIcon: 'Square',
  SquareUnlock01Icon: 'Unlock',
  StarIcon: 'Star',
  Sun01Icon: 'Sun',
  ThumbsDownIcon: 'ThumbsDown',
  ThumbsUpIcon: 'ThumbsUp',
  Tick01Icon: 'Check',
  TrelloIcon: 'Trello',
  TwitterIcon: 'Twitter',
  UserCircleIcon: 'UserCircle',
  UserGroupIcon: 'Users',
  UserIcon: 'User',
  Video01Icon: 'Video',
  ViewIcon: 'Eye',
  ViewOffIcon: 'EyeOff',
  VolumeMute01Icon: 'VolumeX',
  WebhookIcon: 'Webhook',
  Wifi01Icon: 'Wifi',
  WorkflowCircle01Icon: 'Workflow',
  WorkHistoryIcon: 'History',
  YoutubeIcon: 'Youtube',
};

function getAllTsxFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      if (!['node_modules', '.next', '.git'].includes(entry)) {
        getAllTsxFiles(fullPath, files);
      }
    } else if (['.tsx', '.ts'].includes(extname(entry))) {
      files.push(fullPath);
    }
  }
  return files;
}

function transformFile(filePath) {
  let content = readFileSync(filePath, 'utf-8');
  
  // Skip if no hugeicons usage
  if (!content.includes('hugeicons')) return false;

  // 1. Extract which HugeIcons are imported
  const coreImportMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*["']@hugeicons\/core-free-icons["'];?\n?/);
  if (!coreImportMatch) return false;

  const hugeIconNames = coreImportMatch[1]
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  // 2. Map to Lucide names, collect those that have a mapping
  const lucideNames = [];
  const unmapped = [];
  for (const name of hugeIconNames) {
    if (ICON_MAP[name]) {
      lucideNames.push(ICON_MAP[name]);
    } else {
      unmapped.push(name);
    }
  }

  if (unmapped.length > 0) {
    console.log(`  UNMAPPED icons in ${filePath}:`, unmapped);
  }

  // Deduplicate lucide names (some might map to same icon)
  const uniqueLucideNames = [...new Set(lucideNames)];

  // 3. Remove the HugeiconsIcon and core-free-icons import lines
  content = content.replace(/import\s*\{[^}]*HugeiconsIcon[^}]*\}\s*from\s*["']@hugeicons\/react["'];?\n?/g, '');
  content = content.replace(/import\s*\{[^}]+\}\s*from\s*["']@hugeicons\/core-free-icons["'];?\n?/g, '');

  // 4. Add lucide-react import (after any existing lucide import, or at the top)
  if (uniqueLucideNames.length > 0) {
    const lucideImportLine = `import { ${uniqueLucideNames.join(', ')} } from "lucide-react";\n`;
    
    // Check if there's already a lucide-react import
    const existingLucideMatch = content.match(/import\s*\{([^}]*)\}\s*from\s*["']lucide-react["'];?\n?/);
    if (existingLucideMatch) {
      // Merge with existing lucide import
      const existingIcons = existingLucideMatch[1]
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      const merged = [...new Set([...existingIcons, ...uniqueLucideNames])].sort();
      content = content.replace(
        /import\s*\{([^}]*)\}\s*from\s*["']lucide-react["'];?\n?/,
        `import { ${merged.join(', ')} } from "lucide-react";\n`
      );
    } else {
      // Insert lucide import at the top (after "use client" if present, then after other imports)
      // Find a good insertion point: after the first import line
      const firstImportIdx = content.indexOf('\nimport ');
      if (firstImportIdx !== -1) {
        // Find the end of the first group of imports
        const lines = content.split('\n');
        let insertAfterLine = 0;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith('import ') || lines[i].startsWith('"use client"') || lines[i].startsWith("'use client'") || lines[i] === '') {
            insertAfterLine = i;
          } else if (lines[i].startsWith('import ')) {
            insertAfterLine = i;
          } else if (insertAfterLine > 0) {
            break;
          }
        }
        // Insert after the last import
        lines.splice(insertAfterLine + 1, 0, lucideImportLine.trimEnd());
        content = lines.join('\n');
      } else {
        content = lucideImportLine + content;
      }
    }
  }

  // 5. Replace <HugeiconsIcon icon={XIcon} ...props /> with <LucideX ...props />
  // Handle self-closing tags
  content = content.replace(
    /<HugeiconsIcon\s+icon=\{([^}]+)\}([^/]*?)\/>/g,
    (match, iconVar, restProps) => {
      const lucideName = ICON_MAP[iconVar.trim()];
      if (!lucideName) {
        console.log(`  Could not map icon variable: ${iconVar.trim()} in ${filePath}`);
        return match; // leave unchanged
      }
      // Clean up the rest props: remove color="currentColor" since Lucide defaults to it
      let cleaned = restProps
        .replace(/\s*color=["']currentColor["']/g, '')
        .replace(/\s*color=\{["']currentColor["']\}/g, '')
        .trim();
      return `<${lucideName}${cleaned ? ' ' + cleaned : ''} />`;
    }
  );

  // Handle cases where the icon prop comes after other props
  content = content.replace(
    /<HugeiconsIcon\s+([^>]*?)icon=\{([^}]+)\}([^/]*?)\/>/g,
    (match, beforeProps, iconVar, afterProps) => {
      const lucideName = ICON_MAP[iconVar.trim()];
      if (!lucideName) {
        console.log(`  Could not map icon variable (alt): ${iconVar.trim()} in ${filePath}`);
        return match;
      }
      let allProps = (beforeProps + ' ' + afterProps)
        .replace(/\s*color=["']currentColor["']/g, '')
        .replace(/\s*color=\{["']currentColor["']\}/g, '')
        .trim();
      return `<${lucideName}${allProps ? ' ' + allProps : ''} />`;
    }
  );

  return content;
}

const srcDir = join(process.cwd(), 'src');
const files = getAllTsxFiles(srcDir);
let changed = 0;

for (const file of files) {
  const result = transformFile(file);
  if (result !== false && result !== readFileSync(file, 'utf-8')) {
    writeFileSync(file, result, 'utf-8');
    console.log(`✓ Updated: ${file.replace(process.cwd(), '')}`);
    changed++;
  }
}

console.log(`\nDone. Updated ${changed} files.`);
