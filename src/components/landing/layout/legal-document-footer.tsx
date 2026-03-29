import Image from "next/image";
import Link from "next/link";

/** Light cream footer matching the marketing landing, for legal pages. */
export function LegalDocumentFooter() {
  return (
    <>
      <footer className="mt-2 w-full bg-[#f5f3ef]">
        <div className="mx-auto w-full max-w-6xl px-6 py-14 sm:px-10">
          <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between md:gap-12">
            <div className="md:max-w-md md:flex-1">
              <Link href="/" className="inline-flex items-center">
                <Image
                  src="/runwise-logo-light.png"
                  alt="runwise logo"
                  className="h-[48px] w-auto object-contain"
                  width={171}
                  height={48}
                />
              </Link>

              <p className="mt-4 max-w-md text-sm leading-relaxed text-black">
                Transform your ideas into automated workflows with AI. No coding required.
              </p>

              <div className="mt-5 flex items-center gap-3">
                <a
                  href="https://x.com/runwise_ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Runwise on X"
                  className="inline-flex h-6 w-6 items-center justify-center text-black transition hover:opacity-80"
                >
                  <span
                    aria-hidden="true"
                    className="h-6 w-6 bg-current [mask-image:url('/assets/icons/x.svg')] [mask-repeat:no-repeat] [mask-size:contain] [mask-position:center] [-webkit-mask-image:url('/assets/icons/x.svg')] [-webkit-mask-repeat:no-repeat] [-webkit-mask-size:contain] [-webkit-mask-position:center]"
                  />
                </a>
                <a
                  href="https://www.instagram.com/runwise.official/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Runwise on Instagram"
                  className="inline-flex h-6 w-6 items-center justify-center text-black transition hover:opacity-80"
                >
                  <span
                    aria-hidden="true"
                    className="h-6 w-6 bg-current [mask-image:url('/assets/icons/instagram.svg')] [mask-repeat:no-repeat] [mask-size:contain] [mask-position:center] [-webkit-mask-image:url('/assets/icons/instagram.svg')] [-webkit-mask-repeat:no-repeat] [-webkit-mask-size:contain] [-webkit-mask-position:center]"
                  />
                </a>
                <a
                  href="https://discord.gg/YdAq6TEZv7"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Runwise on Discord"
                  className="inline-flex h-6 w-6 items-center justify-center text-black transition hover:opacity-80"
                >
                  <span
                    aria-hidden="true"
                    className="h-6 w-6 bg-current [mask-image:url('/assets/icons/discord.svg')] [mask-repeat:no-repeat] [mask-size:contain] [mask-position:center] [-webkit-mask-image:url('/assets/icons/discord.svg')] [-webkit-mask-repeat:no-repeat] [-webkit-mask-size:contain] [-webkit-mask-position:center]"
                  />
                </a>
              </div>
            </div>

            <div className="md:ml-auto md:w-auto md:flex-none">
              <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:gap-12">
                <div>
                  <h3 className="text-sm font-medium tracking-wide text-black">Navigation</h3>
                  <ul className="mt-4 space-y-2 text-sm text-black">
                    <li>
                      <Link className="text-black underline-offset-2 transition hover:underline" href="/">
                        Home
                      </Link>
                    </li>
                    <li>
                      <Link className="text-black underline-offset-2 transition hover:underline" href="/about">
                        About
                      </Link>
                    </li>
                    <li>
                      <Link className="text-black underline-offset-2 transition hover:underline" href="/features">
                        Features
                      </Link>
                    </li>
                    <li>
                      <Link className="text-black underline-offset-2 transition hover:underline" href="/use-cases">
                        Use Cases
                      </Link>
                    </li>
                    <li>
                      <Link className="text-black underline-offset-2 transition hover:underline" href="/pricing">
                        Pricing
                      </Link>
                    </li>
                    <li>
                      <Link className="text-black underline-offset-2 transition hover:underline" href="/blog">
                        Blog
                      </Link>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-medium tracking-wide text-black">Contact</h3>
                  <div className="mt-4 space-y-2 text-sm text-black">
                    <p>
                      <span className="text-black">Email:</span>{" "}
                      <a
                        className="text-black underline underline-offset-2 transition hover:opacity-80"
                        href="mailto:hello@runwiseai.app"
                      >
                        hello@runwiseai.app
                      </a>
                    </p>
                    <p>
                      <span className="text-black">Phone:</span>{" "}
                      <a
                        className="text-black underline underline-offset-2 transition hover:opacity-80"
                        href="tel:+640223591512"
                      >
                        +64 022 359 1512
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <div className="w-full bg-[#f5f3ef]">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-5 sm:px-10">
          <p className="text-xs text-black">© {new Date().getFullYear()} Runwise. All rights reserved.</p>
          <p className="text-right text-xs text-black">
            <Link href="/privacy" className="text-black underline underline-offset-2 transition hover:opacity-80">
              Privacy Policy
            </Link>
            {" and "}
            <Link href="/terms" className="text-black underline underline-offset-2 transition hover:opacity-80">
              Terms of Service
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
