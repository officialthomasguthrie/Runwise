"use client";

import type { PropsWithChildren } from "react";
import React from "react";
import { X as CloseIcon, Menu02 } from "@untitledui/icons";
import {
    Button as AriaButton,
    Dialog as AriaDialog,
    DialogTrigger as AriaDialogTrigger,
    Modal as AriaModal,
    ModalOverlay as AriaModalOverlay,
} from "react-aria-components";
import { cx } from "@/utils/cx";
import { useTheme } from "next-themes";

export const MobileNavigationHeader = ({ children }: PropsWithChildren) => {
    const [mounted, setMounted] = React.useState(false);
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

    return (
        <AriaDialogTrigger>
            <header className="flex h-16 items-center justify-between border-b border-secondary bg-primary py-3 pr-2 pl-4 lg:hidden">
                <img
                    key={`logo-${theme}-${mounted}`}
                    src={logoSrc}
                    alt="Runwise Logo"
                    width={150}
                    height={40}
                    className="h-9 w-auto bg-transparent"
                    style={{ background: 'transparent', backgroundColor: 'transparent' }}
                    suppressHydrationWarning
                />

                <AriaButton
                    aria-label="Expand navigation menu"
                    className="group flex items-center justify-center rounded-lg bg-primary p-2 text-fg-secondary outline-focus-ring hover:bg-primary_hover hover:text-fg-secondary_hover focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                    <Menu02 className="size-6 transition duration-200 ease-in-out group-aria-expanded:opacity-0" />
                    <CloseIcon className="absolute size-6 opacity-0 transition duration-200 ease-in-out group-aria-expanded:opacity-100" />
                </AriaButton>
            </header>

            <AriaModalOverlay
                isDismissable
                className={({ isEntering, isExiting }) =>
                    cx(
                        "fixed inset-0 z-50 cursor-pointer bg-overlay/70 pr-16 backdrop-blur-md lg:hidden",
                        isEntering && "duration-300 ease-in-out animate-in fade-in",
                        isExiting && "duration-200 ease-in-out animate-out fade-out",
                    )
                }
            >
                {({ state }) => (
                    <>
                        <AriaButton
                            aria-label="Close navigation menu"
                            onPress={() => state.close()}
                            className="fixed top-3 right-2 flex cursor-pointer items-center justify-center rounded-lg p-2 text-fg-white/70 outline-focus-ring hover:bg-white/10 hover:text-fg-white focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                            <CloseIcon className="size-6" />
                        </AriaButton>

                        <AriaModal className="w-full cursor-auto will-change-transform">
                            <AriaDialog className="h-dvh outline-hidden focus:outline-hidden">{children}</AriaDialog>
                        </AriaModal>
                    </>
                )}
            </AriaModalOverlay>
        </AriaDialogTrigger>
    );
};
