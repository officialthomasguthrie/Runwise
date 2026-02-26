/**
 * Fix remaining HugeiconsIcon usages that the first script missed:
 * 1. JSX tags with "/" in className (like top-1/2, text-foreground/60)
 * 2. Icon names used as plain values in data arrays (not JSX)
 * 3. Unmapped icons — add to mappings and fix
 */
import { readFileSync, writeFileSync } from 'fs';

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
  CheckmarkBadge01Icon: 'BadgeCheck',
  CheckmarkCircle01Icon: 'CheckCircle2',
  CheckmarkSquare01Icon: 'CheckSquare',
  CircleIcon: 'Circle',
  ClipboardIcon: 'Clipboard',
  Clock01Icon: 'Clock',
  CloudIcon: 'Cloud',
  CodeIcon: 'Code',
  Coins01Icon: 'Coins',
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
  KeyboardIcon: 'Keyboard',
  LanguageCircleIcon: 'Languages',
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
  Maximize02Icon: 'Maximize2',
  Menu01Icon: 'Menu',
  Message01Icon: 'MessageSquare',
  Mic01Icon: 'Mic',
  Minimize02Icon: 'Minimize2',
  MoonIcon: 'Moon',
  Mortarboard01Icon: 'GraduationCap',
  Mouse01Icon: 'Mouse',
  MusicNote01Icon: 'Music',
  MoveRightIcon: 'MoveRight',
  CallRinging01Icon: 'PhoneCall',
  AiNetworkIcon: 'Network',
  BrainIcon: 'Brain',
  CpuIcon: 'Cpu',
  SparklesIcon: 'Sparkles',
  TextIcon: 'Type',
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

function addToLucideImport(content, iconsToAdd) {
  const unique = [...new Set(iconsToAdd)];
  if (unique.length === 0) return content;

  const existingMatch = content.match(/import\s*\{([^}]*)\}\s*from\s*["']lucide-react["'];?/);
  if (existingMatch) {
    const existing = existingMatch[1].split(',').map(s => s.trim()).filter(Boolean);
    const merged = [...new Set([...existing, ...unique])].sort();
    return content.replace(
      /import\s*\{([^}]*)\}\s*from\s*["']lucide-react["'];?/,
      `import { ${merged.join(', ')} } from "lucide-react";`
    );
  } else {
    // Add after first import line
    return content.replace(
      /^(["']use client["'];\n?\n?)?/,
      `$1import { ${unique.join(', ')} } from "lucide-react";\n`
    );
  }
}

function fixFile(filePath) {
  let content = readFileSync(filePath, 'utf-8');
  const original = content;

  // Step 1: Fix any remaining <HugeiconsIcon icon={X} ...props /> patterns
  // Use a more permissive approach: find HugeiconsIcon tags character by character
  const hugeTagRegex = /<HugeiconsIcon\b([^>]*?)\/>/gs;
  const newIcons = new Set();
  
  content = content.replace(hugeTagRegex, (match, innerContent) => {
    // Extract the icon prop
    const iconMatch = innerContent.match(/\bicon=\{(\w+)\}/);
    if (!iconMatch) return match;
    
    const hugeIconName = iconMatch[1];
    const lucideName = ICON_MAP[hugeIconName];
    if (!lucideName) {
      console.log(`  Still unmapped: ${hugeIconName} in ${filePath}`);
      return match;
    }
    
    newIcons.add(lucideName);
    
    // Remove the icon={X} prop and color="currentColor" from the rest
    let cleaned = innerContent
      .replace(/\s*\bicon=\{[^}]+\}/, '')
      .replace(/\s*color=["']currentColor["']/, '')
      .replace(/\s*color=\{["']currentColor["']\}/, '')
      .trim();
    
    return `<${lucideName}${cleaned ? ' ' + cleaned : ''} />`;
  });

  // Step 2: Fix plain icon name references in data arrays (icon: XIcon pattern)
  for (const [hugeName, lucideName] of Object.entries(ICON_MAP)) {
    // Match `icon: HugeName` or `icon: HugeName,` patterns (not inside JSX icon={...})
    const dataArrayRegex = new RegExp(`\\bicon:\\s*${hugeName}\\b`, 'g');
    if (dataArrayRegex.test(content)) {
      content = content.replace(new RegExp(`\\bicon:\\s*${hugeName}\\b`, 'g'), `icon: ${lucideName}`);
      newIcons.add(lucideName);
    }
  }

  // Step 3: Add any new icons to the lucide import
  if (newIcons.size > 0) {
    content = addToLucideImport(content, [...newIcons]);
  }

  // Step 4: Clean up any leftover HugeiconsIcon or core-free-icons imports
  content = content.replace(/import\s*\{[^}]*HugeiconsIcon[^}]*\}\s*from\s*["']@hugeicons\/react["'];?\n?/g, '');
  content = content.replace(/import\s*\{[^}]+\}\s*from\s*["']@hugeicons\/core-free-icons["'];?\n?/g, '');

  if (content !== original) {
    writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Fixed: ${filePath.split('\\src\\')[1] || filePath}`);
    return true;
  }
  return false;
}

const FILES = [
  'src/components/sections/AboutCTA.tsx',
  'src/components/sections/WhatWeAreBuilding.tsx',
  'src/components/ui/appearance-settings.tsx',
  'src/components/ui/authentication-settings.tsx',
  'src/components/ui/button-colorful.tsx',
  'src/components/ui/call-to-action.tsx',
  'src/components/ui/credit-balance.tsx',
  'src/components/ui/integrations-settings.tsx',
  'src/components/ui/mobile-menu.tsx',
  'src/components/ui/preferences-settings.tsx',
  'src/components/ui/pricing-card.tsx',
  'src/components/ui/sidebar.tsx',
  'src/components/ui/privacy-settings.tsx',
  'src/components/ui/security-settings.tsx',
  'src/components/ui/support-settings.tsx',
  'src/components/ui/notification-settings.tsx',
  'src/components/ui/notifications-settings.tsx',
  'src/app/analytics/page.tsx',
  'src/app/dashboard/page.tsx',
  'src/app/workflows/page.tsx',
];

const { join } = await import('path');
const cwd = process.cwd();
let fixed = 0;
for (const rel of FILES) {
  const fullPath = join(cwd, rel.replace(/\//g, '\\'));
  try {
    if (fixFile(fullPath)) fixed++;
  } catch (e) {
    console.log(`  Error processing ${rel}:`, e.message);
  }
}
console.log(`\nFixed ${fixed} files.`);
