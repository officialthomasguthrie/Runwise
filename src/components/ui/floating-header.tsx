'use client';

import React from 'react';
import { MenuIcon } from 'lucide-react';
import { Sheet, SheetContent, SheetFooter } from '@/components/ui/sheet';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useTheme } from 'next-themes';

export function FloatingHeader() {
	const [open, setOpen] = React.useState(false);
	const [mounted, setMounted] = React.useState(false);
	const pathname = usePathname();
	const router = useRouter();
	const { user, signOut } = useAuth();
	const { theme } = useTheme();

	// Fix hydration mismatch by only using theme after mount
	React.useEffect(() => {
		setMounted(true);
	}, []);

	// Get the logo source based on theme
	const logoSrc = React.useMemo(() => {
		if (!mounted) return '/runwise-logo-dark.png'; // Default to dark before mount
		return theme === 'light' ? '/runwise-logo-light.png' : '/runwise-logo-dark.png';
	}, [mounted, theme]);

	const links = [
		{
			label: 'Home',
			href: '/',
		},
		{
			label: 'About',
			href: '/about',
		},
		{
			label: 'Features',
			href: '/features',
		},
		{
			label: 'Pricing',
			href: '/pricing',
		},
		{
			label: 'Contact',
			href: '/contact',
		},
		{
			label: 'Docs',
			href: '#docs',
		},
	];

	const handleSignOut = async () => {
		try {
			await signOut();
			router.push('/');
		} catch (error) {
			console.error('Error signing out:', error);
		}
	};

	const getUserInitials = () => {
		if (!user) return 'U';
		
		const firstName = user.user_metadata?.first_name || '';
		const lastName = user.user_metadata?.last_name || '';
		
		if (firstName && lastName) {
			return `${firstName[0]}${lastName[0]}`.toUpperCase();
		}
		
		if (firstName) {
			return firstName[0].toUpperCase();
		}
		
		if (user.email) {
			return user.email[0].toUpperCase();
		}
		
		return 'U';
	};

	const getUserDisplayName = () => {
		if (!user) return 'User';
		
		const firstName = user.user_metadata?.first_name || '';
		const lastName = user.user_metadata?.last_name || '';
		
		if (firstName && lastName) {
			return `${firstName} ${lastName}`;
		}
		
		if (firstName) {
			return firstName;
		}
		
		return user.email?.split('@')[0] || 'User';
	};

	return (
		<header
			className={cn(
				'sticky top-4 sm:top-6 z-50',
				'mx-auto w-full max-w-xs sm:max-w-md md:max-w-2xl lg:max-w-3xl xl:max-w-4xl rounded-lg border border-border shadow-lg',
				'bg-background/95 supports-[backdrop-filter]:bg-background/80 backdrop-blur-lg',
			)}
			suppressHydrationWarning={true}
		>
			<nav className="mx-auto flex items-center justify-between p-1.5" suppressHydrationWarning={true}>
				<a href="/" className="hover:bg-accent flex cursor-pointer items-center rounded-md px-2 py-1 duration-100" suppressHydrationWarning={true}>
					<img
						key={`logo-${theme}-${mounted}`}
						src={logoSrc}
						alt="Runwise Logo"
						width={150}
						height={40}
						className="h-5 md:h-7 w-auto bg-transparent"
						style={{ background: 'transparent', backgroundColor: 'transparent' }}
						suppressHydrationWarning
					/>
				</a>
				<div className="hidden items-center gap-1 sm:flex" suppressHydrationWarning={true}>
					{links.map((link) => {
						const isActive = pathname === link.href;
						return (
							<a
								key={link.label}
								className={cn(
									"px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors",
									isActive 
										? "text-foreground" 
										: "text-muted-foreground hover:text-foreground hover:bg-accent"
								)}
								href={link.href}
								suppressHydrationWarning={true}
							>
								{link.label}
							</a>
						);
					})}
				</div>
				<div className="flex items-center gap-2" suppressHydrationWarning={true}>
					{user ? (
						// User Account Button - Direct to Dashboard
						<Button 
							variant="ghost" 
							className="flex items-center gap-2 px-2 py-1 hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-pink-500/10"
							onClick={() => router.push('/dashboard')}
						>
							<Avatar className="h-6 w-6">
								<AvatarFallback className="bg-gradient-to-br from-purple-500 to-purple-600 text-white text-xs font-medium">
									{getUserInitials()}
								</AvatarFallback>
							</Avatar>
							<span className="hidden sm:inline text-sm font-medium text-foreground">
								Welcome, {getUserDisplayName()}
							</span>
						</Button>
					) : (
						// Login Button
						<Button size="sm" variant="secondary" asChild>
							<a href="/login">Login</a>
						</Button>
					)}
					<Sheet open={open} onOpenChange={setOpen}>
						<Button
							size="icon"
							variant="outline"
							onClick={() => setOpen(!open)}
							className="sm:hidden"
						>
							<MenuIcon className="size-4" />
						</Button>
						<SheetContent
							className="bg-background/95 supports-[backdrop-filter]:bg-background/80 gap-0 backdrop-blur-lg border-border"
							showClose={false}
							side="left"
						>
						<div className="grid gap-y-2 overflow-y-auto px-4 pt-12 pb-5">
							{links.map((link) => {
								const isActive = pathname === link.href;
								return (
									<a
										key={link.label}
										className={cn(
											"px-3 py-2 rounded-md text-sm font-medium transition-colors justify-start",
											isActive 
												? "text-foreground" 
												: "text-muted-foreground hover:text-foreground hover:bg-accent"
										)}
										href={link.href}
										suppressHydrationWarning={true}
									>
										{link.label}
									</a>
								);
							})}
						</div>
							<SheetFooter className="bg-muted/50 border-border">
								<div className="flex gap-2 w-full">
									{user ? (
										// Mobile User Account
										<div className="flex flex-col gap-2 w-full">
											<div className="flex items-center gap-2 px-3 py-2">
												<Avatar className="h-6 w-6">
													<AvatarFallback className="bg-gradient-to-br from-purple-500 to-purple-600 text-white text-xs font-medium">
														{getUserInitials()}
													</AvatarFallback>
												</Avatar>
												<span className="text-sm font-medium text-foreground">
													Welcome, {getUserDisplayName()}
												</span>
											</div>
											<Button variant="outline" className="flex-1" onClick={() => router.push('/dashboard')}>
												Dashboard
											</Button>
											<Button variant="outline" className="flex-1" onClick={() => router.push('/settings')}>
												Settings
											</Button>
											<Button variant="outline" className="flex-1" onClick={handleSignOut}>
												Sign Out
											</Button>
										</div>
									) : (
										// Mobile Login
										<Button variant="outline" className="flex-1" asChild>
											<a href="/login">Login</a>
										</Button>
									)}
								</div>
							</SheetFooter>
						</SheetContent>
					</Sheet>
				</div>
			</nav>
		</header>
	);
}
