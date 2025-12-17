import { Header } from "../components/Header";
import { Footer } from "../components/Footer";

export const metadata = {
  title: "Privacy Policy | Runwise",
  description: "Privacy Policy for Runwise - how we collect, use, and protect your data when using our AI-powered workflow builder.",
};

export default function PrivacyPage() {
  const lastUpdated = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="landing-page min-h-screen">
      <Header />

      <section className="pt-[140px] px-6 md:px-10 pb-20 relative">
        <div className="max-w-[900px] w-full mx-auto">
          {/* Title */}
          <div className="mb-12">
            <h1 className="text-[35px] md:text-[48px] font-medium -tracking-[.02em] leading-[1.1em] text-white mb-4">
              Privacy Policy
            </h1>
            <p className="text-[#ffffffb3] text-base md:text-lg font-normal leading-[1.5em]">
              Last updated: {lastUpdated}
            </p>
          </div>

          {/* Introduction */}
          <div className="mb-8">
            <p className="text-[#ffffffcc] text-base leading-[1.6em] mb-4">
              This Privacy Policy explains how <strong>Runwise</strong> ("Runwise",
              "we", "us", or "our") collects, uses, discloses, and protects your
              information when you use our website, application, APIs, and related
              services (collectively, the "Service").
            </p>
            <p className="text-[#ffffffcc] text-base leading-[1.6em]">
              By using Runwise, you agree to the practices described in this
              Privacy Policy. If you do not agree with this Policy, you should not
              use the Service.
            </p>
          </div>

          {/* Privacy Content */}
          <div className="space-y-10 text-[#ffffffcc]">
            {/* Section 1 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-medium text-white mb-4">
                1. Information We Collect
              </h2>

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-medium text-white mb-2">
                    1.1 Information You Provide
                  </h3>
                  <p className="text-base leading-[1.6em] mb-3">
                    We may collect information you voluntarily provide when you
                    interact with the Service, including:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4 mb-3">
                    <li>Name, email address, and account details</li>
                    <li>
                      Prompts, workflow descriptions, configurations, and other
                      inputs you provide to generate or run automations
                    </li>
                    <li>
                      Billing and payment details (processed securely via
                      third-party payment providers; we do not store full card
                      numbers)
                    </li>
                    <li>
                      Communications with us, such as support requests, feedback,
                      or survey responses
                    </li>
                    <li>
                      Optional profile or team information, if you choose to
                      provide it
                    </li>
                  </ul>
                  <p className="text-base leading-[1.6em]">
                    In some cases, your inputs may contain personal or sensitive
                    information about you or others. You are responsible for
                    ensuring that you have the right to share such information
                    with us and that you comply with applicable laws when doing
                    so.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-medium text-white mb-2">
                    1.2 Information Collected Automatically
                  </h3>
                  <p className="text-base leading-[1.6em] mb-3">
                    When you use Runwise, we may automatically collect certain
                    technical and usage information, including:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4 mb-3">
                    <li>IP address, device identifiers, and approximate location</li>
                    <li>
                      Browser type, operating system, and device information
                    </li>
                    <li>
                      Usage data such as pages viewed, features used, clicks,
                      and time spent in the app
                    </li>
                    <li>
                      Log data, timestamps, error reports, and interaction events
                    </li>
                    <li>
                      Cookies, local storage, and similar technologies used to
                      remember your preferences and maintain sessions
                    </li>
                  </ul>
                  <p className="text-base leading-[1.6em]">
                    We use this information to operate, secure, and improve the
                    Service, understand how users interact with Runwise, and
                    ensure reliable performance.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-medium text-white mb-2">
                    1.3 Third-Party Integrations
                  </h3>
                  <p className="text-base leading-[1.6em] mb-3">
                    If you connect third-party services (for example, SaaS tools
                    or external APIs) to Runwise, we may collect and process:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4 mb-3">
                    <li>
                      Authorization tokens, API keys, and connection metadata
                    </li>
                    <li>
                      Data necessary to execute workflows on your behalf, such as
                      records from integrated tools (e.g. messages, form
                      submissions, files, or events)
                    </li>
                    <li>
                      Basic account information from those third-party services,
                      as permitted by their APIs and your permissions
                    </li>
                  </ul>
                  <p className="text-base leading-[1.6em]">
                    We only access the data required to provide and maintain the
                    Service and the workflows you configure. You can revoke
                    access at any time from the third-party service or within
                    Runwise (where supported).
                  </p>
                </div>
              </div>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-medium text-white mb-4">
                2. How We Use Your Information
              </h2>
              <p className="text-base leading-[1.6em] mb-3">
                We use the information we collect for the following purposes:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-3">
                <li>To provide, operate, and maintain the Service</li>
                <li>
                  To generate, run, and monitor AI-powered workflows and
                  automations that you configure
                </li>
                <li>
                  To personalize your experience, such as remembering preferences
                  or recently used workflows
                </li>
                <li>
                  To improve performance, reliability, and functionality of
                  Runwise, including through analytics and research
                </li>
                <li>
                  To communicate with you about product updates, security
                  notices, support responses, and important service-related
                  information
                </li>
                <li>
                  To process payments, manage subscriptions, and prevent fraud or
                  unauthorized use
                </li>
                <li>
                  To detect, investigate, and mitigate abuse, security issues, or
                  violations of our Terms and Conditions
                </li>
                <li>
                  To comply with legal obligations and enforce our agreements
                </li>
              </ul>
              <p className="text-base leading-[1.6em]">
                Where required by law, we rely on appropriate legal bases to
                process your information, including performance of a contract,
                legitimate interests (such as improving the Service and ensuring
                security), compliance with legal obligations, and, where
                applicable, your consent.
              </p>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-medium text-white mb-4">
                3. AI Processing and Data Use
              </h2>
              <p className="text-base leading-[1.6em] mb-3">
                Runwise uses artificial intelligence systems to process prompts,
                generate workflows, and assist with automation design. This may
                involve sending your inputs to AI models, interpreting results,
                and storing generated outputs.
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-3">
                <li>
                  Your prompts, workflow descriptions, and related inputs may be
                  processed by AI models to generate responses and automation
                  logic.
                </li>
                <li>
                  We do <strong>not</strong> use your private workflow data to
                  train publicly available models without your explicit consent.
                </li>
                <li>
                  We may use anonymized or aggregated data to improve model
                  quality, reliability, and system performance.
                </li>
                <li>
                  Outputs may be automatically analyzed for abuse detection,
                  safety, or quality control (for example, to prevent spam or
                  harmful behavior).
                </li>
              </ul>
              <p className="text-base leading-[1.6em]">
                You remain responsible for reviewing and validating
                AI-generated outputs before relying on them. You should not use
                AI outputs as the sole basis for decisions that could result in
                significant harm without appropriate human review.
              </p>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-medium text-white mb-4">
                4. Cookies and Tracking Technologies
              </h2>
              <p className="text-base leading-[1.6em] mb-3">
                We use cookies and similar tracking technologies to support core
                functionality and improve your experience, including:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-3">
                <li>Maintaining login sessions and authentication</li>
                <li>Remembering your preferences and settings</li>
                <li>Understanding usage patterns and feature adoption</li>
                <li>Measuring performance, errors, and user flows</li>
              </ul>
              <p className="text-base leading-[1.6em] mb-3">
                You can control cookies through your browser settings, including
                disabling certain types of cookies. However, if you choose to
                block or delete cookies, some features of Runwise may not
                function properly.
              </p>
              <p className="text-base leading-[1.6em]">
                We do not use cookies for invasive tracking across unrelated
                websites, and we do not sell your browsing data.
              </p>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-medium text-white mb-4">
                5. Data Sharing and Disclosure
              </h2>
              <p className="text-base leading-[1.6em] mb-3">
                We may share your information in the following circumstances:
              </p>

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-medium text-white mb-2">
                    5.1 Service Providers
                  </h3>
                  <p className="text-base leading-[1.6em] mb-3">
                    We work with trusted third-party vendors and service
                    providers who help us operate and improve Runwise, including:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4 mb-3">
                    <li>Cloud hosting and infrastructure providers</li>
                    <li>Payment and billing processors</li>
                    <li>Analytics and monitoring tools</li>
                    <li>Email and communication providers</li>
                    <li>Security and logging services</li>
                  </ul>
                  <p className="text-base leading-[1.6em]">
                    These providers only receive the information necessary to
                    perform their services and are obligated to protect your data
                    and use it only for the purposes we specify.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-medium text-white mb-2">
                    5.2 Legal Requirements
                  </h3>
                  <p className="text-base leading-[1.6em]">
                    We may disclose your information if required to do so by law
                    or in response to valid legal requests, such as subpoenas,
                    court orders, or government investigations, or to:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4 mt-2">
                    <li>Comply with applicable laws or regulations</li>
                    <li>Protect the rights, property, or safety of Runwise, our users, or the public</li>
                    <li>Detect, prevent, or address fraud, security, or technical issues</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-medium text-white mb-2">
                    5.3 Business Transfers
                  </h3>
                  <p className="text-base leading-[1.6em]">
                    If Runwise is involved in a merger, acquisition, financing,
                    reorganization, or sale of assets, your information may be
                    transferred as part of that transaction. We will take
                    reasonable steps to ensure that any acquirer continues to
                    protect your information in a manner consistent with this
                    Privacy Policy.
                  </p>
                </div>
              </div>

              <p className="text-base leading-[1.6em] mt-3">
                We do <strong>not</strong> sell your personal data.
              </p>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-medium text-white mb-4">
                6. Data Retention
              </h2>
              <p className="text-base leading-[1.6em] mb-3">
                We retain your information only for as long as necessary to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-3">
                <li>Provide and maintain the Service and your workflows</li>
                <li>Comply with legal, accounting, and regulatory requirements</li>
                <li>Resolve disputes and enforce our agreements</li>
                <li>
                  Maintain security logs and abuse prevention records for a
                  reasonable period
                </li>
              </ul>
              <p className="text-base leading-[1.6em] mb-3">
                When information is no longer needed for these purposes, we
                will delete it or anonymize it so that it can no longer be
                linked to you.
              </p>
              <p className="text-base leading-[1.6em]">
                You may request deletion of your account and associated data,
                subject to certain limitations (for example, where we are
                required by law to retain specific records).
              </p>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-medium text-white mb-4">
                7. Data Security
              </h2>
              <p className="text-base leading-[1.6em] mb-3">
                We implement reasonable technical and organizational safeguards
                designed to protect your information from unauthorized access,
                disclosure, alteration, or destruction. These measures may
                include:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-3">
                <li>Encryption in transit (HTTPS) for data sent to and from the Service</li>
                <li>Access controls and authentication for internal systems</li>
                <li>Monitoring and logging of critical infrastructure</li>
                <li>Regular updates and security patches for underlying platforms</li>
              </ul>
              <p className="text-base leading-[1.6em]">
                However, no system is 100% secure. You acknowledge and accept
                that there is inherent risk in transmitting information online
                and that we cannot guarantee absolute security. You are
                responsible for using strong, unique passwords and keeping your
                account credentials confidential.
              </p>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-medium text-white mb-4">
                8. Your Rights
              </h2>
              <p className="text-base leading-[1.6em] mb-3">
                Depending on your jurisdiction, you may have certain rights
                regarding your personal data, which may include:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-3">
                <li>Accessing the personal data we hold about you</li>
                <li>Correcting inaccurate or incomplete information</li>
                <li>Requesting deletion of your data, subject to legal obligations</li>
                <li>Requesting restriction of certain processing activities</li>
                <li>Objecting to processing based on legitimate interests</li>
                <li>
                  Withdrawing consent where we rely on your consent to process
                  data
                </li>
                <li>
                  Requesting a copy of your data in a portable format, where
                  applicable
                </li>
              </ul>
              <p className="text-base leading-[1.6em] mb-3">
                To exercise these rights, please contact us using the details in
                the <strong>Contact Us</strong> section below. We may need to
                verify your identity before processing certain requests.
              </p>
              <p className="text-base leading-[1.6em]">
                If you believe your rights have been violated, you may also have
                the right to lodge a complaint with your local data protection
                authority.
              </p>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-medium text-white mb-4">
                9. Children’s Privacy
              </h2>
              <p className="text-base leading-[1.6em] mb-3">
                Runwise is not intended for children under <strong>13</strong>,
                and we do not knowingly collect personal data from children under
                this age. If you are under 13, you must not use the Service or
                provide us with any personal information.
              </p>
              <p className="text-base leading-[1.6em]">
                If you believe that a child has provided us with personal data,
                please contact us immediately. We will take steps to delete such
                information as soon as reasonably practicable.
              </p>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-medium text-white mb-4">
                10. International Data Transfers
              </h2>
              <p className="text-base leading-[1.6em] mb-3">
                Runwise is operated from New Zealand and may use cloud
                infrastructure located in other countries. As a result, your
                information may be processed and stored in jurisdictions that
                have different data protection laws than your home country.
              </p>
              <p className="text-base leading-[1.6em]">
                By using the Service, you consent to the transfer of information
                to countries outside your country of residence, including
                countries that may not provide the same level of data protection.
                Where required, we will take appropriate steps to ensure that
                international transfers are subject to suitable safeguards.
              </p>
            </section>

            {/* Section 11 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-medium text-white mb-4">
                11. Changes to This Privacy Policy
              </h2>
              <p className="text-base leading-[1.6em] mb-3">
                We may update this Privacy Policy from time to time to reflect
                changes in our practices, legal requirements, or the Service
                itself. When we make material changes, we will:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-3">
                <li>Update the "Last updated" date at the top of this page</li>
                <li>Provide a prominent notice within the Service, where appropriate</li>
                <li>Notify you by email, if you have an active account, where required</li>
              </ul>
              <p className="text-base leading-[1.6em]">
                Continued use of Runwise after any changes become effective
                constitutes your acceptance of the updated Privacy Policy. If you
                do not agree with the changes, you should stop using the Service.
              </p>
            </section>

            {/* Section 12 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-medium text-white mb-4">
                12. Contact Us
              </h2>
              <p className="text-base leading-[1.6em] mb-3">
                If you have questions, concerns, or requests regarding this
                Privacy Policy or our data practices, please contact us at:
              </p>
              <div className="bg-[#ffffff08] border border-[#ffffff1a] rounded-lg p-6 backdrop-blur-sm">
                <p className="text-base leading-[1.6em] mb-2">
                  <strong className="text-white">Runwise</strong>
                </p>
                <p className="text-base leading-[1.6em] mb-2">
                  Email:{" "}
                  <a
                    href="mailto:hello@runwiseai.app"
                    className="text-[#bd28b3] hover:underline"
                  >
                    hello@runwiseai.app
                  </a>
                </p>
                <p className="text-base leading-[1.6em]">
                  Phone:{" "}
                  <a
                    href="tel:+640223591512"
                    className="text-[#bd28b3] hover:underline"
                  >
                    +64 022 359 1512
                  </a>
                </p>
              </div>
            </section>

            {/* Acceptance */}
            <section className="pt-8 border-t border-[#ffffff1a]">
              <p className="text-base leading-[1.6em] text-[#ffffffcc]">
                By using Runwise, you acknowledge that you have read, understood,
                and agree to this Privacy Policy.
              </p>
            </section>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}


