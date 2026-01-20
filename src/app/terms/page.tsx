import { Header } from "../components/Header";
import { Footer } from "../components/Footer";

export const metadata = {
  title: "Terms and Conditions | Runwise",
  description: "Terms and Conditions for Runwise - AI-powered workflow builder platform",
};

export default function TermsPage() {
  return (
    <main className="landing-page min-h-screen">
      <Header />
      
      <section className="pt-[140px] px-6 md:px-10 pb-20 relative">
        <div className="max-w-[900px] w-full mx-auto">
          {/* Title */}
          <div className="mb-12">
            <h1 className="text-[35px] md:text-[48px] font-medium -tracking-[.02em] leading-[1.1em] text-white mb-4">
              Terms and Conditions
            </h1>
            <p className="text-[#ffffffb3] text-base md:text-lg font-normal leading-[1.5em]">
              Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Introduction */}
          <div className="mb-8">
            <p className="text-[#ffffffcc] text-base leading-[1.6em]">
              These Terms and Conditions ("Terms") govern your access to and use of <strong>Runwise</strong> ("Runwise", "we", "us", or "our"), including our website, application, APIs, and related services (collectively, the "Service"). By accessing or using Runwise, you agree to be bound by these Terms. If you do not agree, do not use the Service.
            </p>
          </div>

          {/* Terms Content */}
          <div className="space-y-10 text-[#ffffffcc]">
            
            {/* Section 1 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-medium text-white mb-4">1. Eligibility and Age Requirement</h2>
              <p className="text-base leading-[1.6em] mb-3">
                You must be at least <strong>18 years old</strong> (or have the legal authority to enter into binding contracts in your jurisdiction) to use Runwise. By using the Service, you represent and warrant that you meet this age requirement and have the legal capacity and authority to enter into these Terms.
              </p>
              <p className="text-base leading-[1.6em]">
                If you are using Runwise on behalf of an organization, you represent and warrant that you have the legal authority to bind that organization to these Terms, and the terms "you" and "your" will refer to both you and the organization.
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-medium text-white mb-4">2. Account Registration</h2>
              <p className="text-base leading-[1.6em] mb-3">
                To access certain features of Runwise, you may be required to create an account. When creating an account, you agree to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-3">
                <li>Maintain the confidentiality of your account credentials and not share them with any third party</li>
                <li>Provide accurate, current, and complete information during registration and keep it updated</li>
                <li>Be responsible for all activity that occurs under your account, whether authorized or not</li>
                <li>Notify us immediately of any unauthorized access or use of your account</li>
                <li>Ensure that your account information does not violate any applicable laws or infringe upon the rights of others</li>
              </ul>
              <p className="text-base leading-[1.6em]">
                We reserve the right to suspend or terminate accounts that violate these Terms, engage in fraudulent activity, or pose a security risk to the Service or other users. We may also require you to verify your identity or account information at any time.
              </p>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-medium text-white mb-4">3. Description of the Service and User Responsibility</h2>
              <p className="text-base leading-[1.6em] mb-3">
                Runwise provides tools that convert plain English prompts into automated workflows, integrations, and processes using artificial intelligence. Our Service includes, but is not limited to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-3">
                <li>AI-powered workflow generation from natural language descriptions</li>
                <li>Integration with third-party services and APIs</li>
                <li>Workflow execution and automation capabilities</li>
                <li>Template library and pre-built workflow components</li>
                <li>Analytics and monitoring tools for workflow performance</li>
              </ul>
              <p className="text-base leading-[1.6em] mb-3">
                <strong>You are fully and solely responsible</strong> for all workflows, inputs, outputs, and actions taken through your use of the Service. This includes, but is not limited to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-3">
                <li>All workflows, automations, and processes you create, configure, or deploy using the Service</li>
                <li>All data, content, and information you input into the Service</li>
                <li>All outputs, results, and consequences of your workflows, whether generated by AI or otherwise</li>
                <li>Ensuring that your workflows comply with all applicable laws, regulations, and third-party terms of service</li>
                <li>Reviewing, testing, and validating all workflows before deployment to production environments</li>
                <li>Any damages, losses, or liabilities arising from your use of the Service</li>
              </ul>
              <p className="text-base leading-[1.6em] mb-3">
                You acknowledge that:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-3">
                <li>Generated workflows may require review, testing, and validation before production use</li>
                <li>Runwise does not guarantee that outputs will be error-free, secure, or suitable for any specific purpose</li>
                <li>The Service may be subject to limitations, including rate limits, storage quotas, and feature availability based on your subscription tier</li>
                <li>We may modify, suspend, or discontinue any aspect of the Service at any time with or without notice</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-medium text-white mb-4">4. Acceptable Use and Prohibited Activities</h2>
              <p className="text-base leading-[1.6em] mb-3">
                You agree <strong>not</strong> to use Runwise to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-3">
                <li>Violate any applicable law, regulation, or third-party right, including intellectual property, privacy, or data protection rights</li>
                <li>Create, distribute, or automate malicious software, spam, phishing attempts, scams, or any form of fraudulent activity</li>
                <li>Engage in any illegal, fraudulent, or unauthorized activity, including but not limited to money laundering, identity theft, or violation of export control laws</li>
                <li>Attempt to bypass security measures, rate limits, access controls, or any other restrictions we implement</li>
                <li>Reverse engineer, decompile, disassemble, or otherwise attempt to derive the source code of the Service</li>
                <li>Resell, sublicense, or exploit the Service for commercial purposes without our express written authorization</li>
                <li>Interfere with or disrupt the Service, servers, or networks connected to the Service</li>
                <li>Use automated systems (bots, scrapers, etc.) to access the Service in a manner that sends more request messages than a human could reasonably produce</li>
                <li>Impersonate any person or entity or misrepresent your affiliation with any person or entity</li>
                <li>Collect or harvest any information about other users without their consent</li>
                <li>Use the Service to build competitive products or services</li>
              </ul>
              <p className="text-base leading-[1.6em] mb-3">
                <strong>Prohibition of Illegal Activity:</strong> You may NOT use Runwise for any illegal, fraudulent, or unauthorized purposes. Any violation of this prohibition will result in <strong>immediate termination</strong> of your account, with or without notice, and you will <strong>not be entitled to any refund</strong> of fees paid, to the maximum extent permitted by law.
              </p>
              <p className="text-base leading-[1.6em]">
                We may investigate and take action against misuse at our sole discretion, including but not limited to suspending or terminating your account, removing content, and reporting violations to law enforcement authorities. In cases of illegal activity, we reserve the right to take immediate action without prior notice.
              </p>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-medium text-white mb-4">5. AI Outputs and Responsibility</h2>
              <p className="text-base leading-[1.6em] mb-3">
                Runwise uses AI systems that generate content and automation logic. These systems are trained on large datasets and may produce outputs that are inaccurate, incomplete, or inappropriate for your specific use case.
              </p>
              <p className="text-base leading-[1.6em] mb-3">
                <strong>AI-Specific Disclaimers:</strong>
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-3">
                <li>AI outputs may be <strong>incorrect, inaccurate, or contain errors</strong> and should not be relied upon without independent verification</li>
                <li>You <strong>must verify all AI-generated outputs</strong> before acting on them, deploying them, or making decisions based on them</li>
                <li>Runwise is <strong>not responsible</strong> for any decisions, actions, or consequences resulting from your use of or reliance on AI-generated content</li>
                <li>Outputs are provided <strong>"as is"</strong> and may be inaccurate, incomplete, or contain errors</li>
                <li>You are solely responsible for reviewing, testing, validating, and deploying any workflows generated by the Service</li>
                <li>You assume all risk associated with the use of AI-generated outputs, including but not limited to data loss, security vulnerabilities, and operational failures</li>
                <li>AI outputs may not always reflect current information, best practices, or legal requirements</li>
                <li>You should not rely solely on AI-generated workflows for critical business operations without proper testing and validation</li>
              </ul>
              <p className="text-base leading-[1.6em]">
                Runwise is <strong>not liable</strong> for damages caused by reliance on generated workflows, including but not limited to financial losses, data breaches, system failures, or any other consequences resulting from the use of AI-generated content. You are responsible for ensuring that any workflows you deploy comply with applicable laws, regulations, and industry standards.
              </p>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-medium text-white mb-4">6. Integrations and Third-Party Services</h2>
              <p className="text-base leading-[1.6em] mb-3">
                Runwise may connect with third-party platforms, services, APIs, and SaaS tools (collectively, "Third-Party Services") to enable workflow functionality. These integrations are provided for your convenience and are subject to the following terms:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-3">
                <li>Your use of Third-Party Services is governed by their own terms of service, privacy policies, and other applicable agreements</li>
                <li>Runwise is <strong>not responsible</strong> for Third-Party Services' availability, performance, downtime, outages, data loss, security breaches, pricing changes, policy enforcement, or changes to their APIs or functionality</li>
                <li>We do not endorse, warrant, or assume responsibility for any Third-Party Services or their content, products, or services</li>
                <li>You are responsible for maintaining valid credentials, API keys, and access tokens for Third-Party Services</li>
                <li>Third-Party Services may impose their own rate limits, usage restrictions, and costs that are separate from Runwise's fees</li>
                <li>Runwise is not liable for any consequences resulting from Third-Party Services' downtime, policy changes, or termination of your access to such services</li>
              </ul>
              <p className="text-base leading-[1.6em]">
                You authorize Runwise to access Third-Party Services on your behalf as configured by you. You are responsible for ensuring that you have the necessary rights and permissions to grant such access. If a Third-Party Service becomes unavailable or changes in a way that affects your workflows, Runwise is not obligated to provide alternative solutions or refunds.
              </p>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-medium text-white mb-4">7. Intellectual Property</h2>
              
              <div className="mb-4">
                <h3 className="text-xl font-medium text-white mb-3">Our Intellectual Property</h3>
                <p className="text-base leading-[1.6em] mb-3">
                  All rights, title, and interest in and to the Service, including but not limited to software, AI models, algorithms, user interfaces, branding, logos, trademarks, documentation, and all other intellectual property rights, belong to Runwise or its licensors. The Service is protected by copyright, trademark, patent, trade secret, and other intellectual property laws.
                </p>
                <p className="text-base leading-[1.6em]">
                  You may not copy, modify, distribute, sell, lease, sublicense, or create derivative works based on the Service without our express written permission. Any unauthorized use of our intellectual property may result in legal action.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium text-white mb-3">Your Content</h3>
                <p className="text-base leading-[1.6em] mb-3">
                  You retain ownership of prompts, configurations, data, workflows, and any other content you submit to or create using the Service ("Your Content"). By using Runwise, you grant us a limited, non-exclusive, royalty-free, worldwide license to:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 mb-3">
                  <li>Process, store, and transmit Your Content solely to provide and improve the Service</li>
                  <li>Use Your Content in anonymized or aggregated form for analytics, machine learning, and service improvement purposes</li>
                  <li>Display Your Content as necessary to provide the Service to you</li>
                </ul>
                <p className="text-base leading-[1.6em]">
                  You represent and warrant that you have all necessary rights, licenses, and permissions to grant us this license and that Your Content does not infringe upon any third-party rights. We reserve the right to remove or refuse to process any content that violates these Terms or applicable law.
                </p>
              </div>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-medium text-white mb-4">8. Payments and Subscriptions</h2>
              <p className="text-base leading-[1.6em] mb-3">
                Certain features of Runwise may require payment. If you choose to subscribe to a paid plan, the following terms apply:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-3">
                <li><strong>Billing:</strong> Fees are billed in advance on a recurring basis (monthly or annually, as selected)</li>
                <li><strong>No Refunds:</strong> All fees are <strong>non-refundable</strong>, to the maximum extent permitted by law. This includes, but is not limited to, subscription fees, one-time payments, and any other charges. No refunds will be provided for any reason, including but not limited to cancellation, termination, dissatisfaction with the Service, or unused portions of your subscription period, except where required by applicable law.</li>
                <li><strong>Price Changes:</strong> We may change pricing with reasonable notice (at least 30 days). Price changes will apply to your next billing cycle unless you cancel your subscription before the change takes effect</li>
                <li><strong>Payment Methods:</strong> You must provide valid payment information and authorize us to charge your payment method for all fees. You are responsible for keeping your payment information up to date</li>
                <li><strong>Taxes:</strong> All fees are exclusive of applicable taxes, which you are responsible for paying</li>
                <li><strong>Renewal:</strong> Subscriptions automatically renew unless you cancel before the renewal date. You can cancel at any time through your account settings</li>
                <li><strong>Cancellation:</strong> If you cancel a subscription, you will continue to have access until the end of your current billing period. No refunds will be provided for the remaining period, to the maximum extent permitted by law</li>
              </ul>
              <p className="text-base leading-[1.6em]">
                Failure to pay may result in suspension or termination of access to paid features. We may also suspend or terminate your account if your payment method is declined, expires, or is otherwise invalid. You are responsible for any fees or charges incurred due to failed payments. No refunds will be provided upon termination or suspension, to the maximum extent permitted by law.
              </p>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-medium text-white mb-4">9. Suspension and Termination</h2>
              <p className="text-base leading-[1.6em] mb-3">
                You may stop using Runwise at any time by canceling your subscription (if applicable) and deleting your account. Upon termination:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-3">
                <li>Your right to use the Service will immediately cease</li>
                <li>You will lose access to your account, workflows, and data associated with your account</li>
                <li>We may delete or anonymize your data in accordance with our Privacy Policy</li>
                <li>Any outstanding fees remain due and payable</li>
                <li><strong>No refunds will be provided</strong> for any fees paid, to the maximum extent permitted by law</li>
              </ul>
              <p className="text-base leading-[1.6em] mb-3">
                <strong>Our Right to Suspend or Terminate:</strong> We reserve the right to suspend or terminate your account and access to the Service <strong>at our sole discretion</strong>, with or without notice, for any reason, including but not limited to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-3">
                <li>You violate these Terms or any applicable law</li>
                <li>Your use poses a legal, security, or operational risk to Runwise or other users</li>
                <li>You engage in fraudulent, abusive, or illegal activity</li>
                <li>You fail to pay required fees (for paid subscriptions)</li>
                <li>We discontinue the Service or your subscription tier</li>
                <li>Any other reason we deem necessary to protect the Service, other users, or our business interests</li>
              </ul>
              <p className="text-base leading-[1.6em] mb-3">
                Upon suspension or termination by us, you will <strong>not be entitled to any refund</strong> of fees paid, to the maximum extent permitted by law. We may suspend or terminate your access immediately, without prior notice, in cases of illegal activity, security threats, or other serious violations.
              </p>
              <p className="text-base leading-[1.6em]">
                Sections of these Terms that by their nature should survive termination (including but not limited to intellectual property, disclaimers, limitations of liability, and indemnification) will survive termination.
              </p>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-medium text-white mb-4">10. Disclaimers</h2>
              <p className="text-base leading-[1.6em] mb-3">
                The Service is provided <strong>"AS IS"</strong> and <strong>"AS AVAILABLE"</strong> without warranties of any kind, either express or implied. To the fullest extent permitted by law, Runwise disclaims all warranties, including but not limited to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-3">
                <li><strong>Merchantability:</strong> The Service may not meet your specific requirements or expectations</li>
                <li><strong>Fitness for a Particular Purpose:</strong> The Service may not be suitable for your intended use case</li>
                <li><strong>Non-Infringement:</strong> The Service may not be free from claims of intellectual property infringement</li>
                <li><strong>Accuracy or Reliability:</strong> AI outputs may contain errors, inaccuracies, or outdated information</li>
                <li><strong>Uninterrupted or Error-Free Operation:</strong> The Service may experience downtime, interruptions, or technical issues</li>
                <li><strong>Security:</strong> While we implement security measures, we cannot guarantee that the Service will be completely secure or free from vulnerabilities</li>
              </ul>
              <p className="text-base leading-[1.6em]">
                Some jurisdictions do not allow the exclusion of implied warranties, so some of the above exclusions may not apply to you. In such cases, our liability will be limited to the maximum extent permitted by law.
              </p>
            </section>

            {/* Section 11 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-medium text-white mb-4">11. Limitation of Liability</h2>
              <p className="text-base leading-[1.6em] mb-3">
                To the maximum extent permitted by applicable law:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-3">
                <li>Runwise shall not be liable for any <strong>indirect, incidental, special, consequential, or punitive damages</strong>, including but not limited to loss of profits, data, revenue, business opportunities, or goodwill</li>
                <li>Runwise's total liability for any claims arising out of or related to these Terms or the Service shall not exceed the amount you paid to Runwise in the <strong>12 months</strong> preceding the claim, or <strong>$100 USD, whichever is lower</strong></li>
                <li>Runwise is not liable for any damages resulting from your use of Third-Party Services, AI-generated outputs, or your failure to properly test or validate workflows</li>
                <li>Runwise is not responsible for any loss or damage resulting from unauthorized access to your account, data breaches, or security incidents</li>
              </ul>
              <p className="text-base leading-[1.6em]">
                These limitations apply regardless of the legal theory (contract, tort, negligence, strict liability, or otherwise) and even if Runwise has been advised of the possibility of such damages. Some jurisdictions do not allow the exclusion or limitation of certain damages, so some of these limitations may not apply to you.
              </p>
            </section>

            {/* Section 12 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-medium text-white mb-4">12. Indemnification</h2>
              <p className="text-base leading-[1.6em] mb-3">
                You agree to <strong>indemnify, defend, and hold harmless</strong> Runwise, its affiliates, officers, directors, employees, agents, and licensors from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising out of or related to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-3">
                <li>Your use of the Service, including any workflows, inputs, outputs, or automations you create or deploy</li>
                <li>Your violation of these Terms or any applicable law, regulation, or third-party right</li>
                <li>Your Content, including any claims that Your Content infringes upon intellectual property, privacy, or other rights</li>
                <li>Your interactions with Third-Party Services through the Service</li>
                <li>Any harm or damage caused by AI-generated outputs that you use or deploy</li>
                <li>Any claims arising from your workflows, data processing, or business operations conducted through the Service</li>
              </ul>
              <p className="text-base leading-[1.6em]">
                We reserve the right to assume exclusive defense and control of any matter subject to indemnification by you, and you agree to cooperate with our defense of such claims. You may not settle any claim without our prior written consent.
              </p>
            </section>

            {/* Section 13 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-medium text-white mb-4">13. Data Security and User Responsibility</h2>
              <p className="text-base leading-[1.6em] mb-3">
                While Runwise implements reasonable security measures to protect your data, you acknowledge and agree that:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-3">
                <li>You are <strong>solely responsible</strong> for maintaining the confidentiality and security of your account credentials, API keys, access tokens, and any other authentication information</li>
                <li>You are responsible for all activities that occur under your account, whether authorized by you or not</li>
                <li>You are responsible for properly configuring access controls, permissions, and security settings for your workflows and integrations</li>
                <li>Runwise is not liable for any loss or damage resulting from unauthorized access to your account, credentials, or data due to your failure to maintain adequate security measures</li>
                <li>You must immediately notify us of any unauthorized access or security breach affecting your account</li>
                <li>While we implement reasonable security measures, we cannot guarantee that the Service will be completely secure or free from vulnerabilities, and you use the Service at your own risk</li>
              </ul>
              <p className="text-base leading-[1.6em]">
                Your use of Runwise is also governed by our <strong>Privacy Policy</strong>, which explains how we collect, use, store, protect, and share your data. By using the Service, you consent to the collection and use of your information as described in our Privacy Policy. Please review our Privacy Policy carefully, as it contains important information about your rights and our practices regarding your personal data.
              </p>
            </section>

            {/* Section 14 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-medium text-white mb-4">14. Privacy</h2>
              <p className="text-base leading-[1.6em]">
                Your use of Runwise is also governed by our <strong>Privacy Policy</strong>, which explains how we collect, use, store, protect, and share your data. By using the Service, you consent to the collection and use of your information as described in our Privacy Policy. Please review our Privacy Policy carefully, as it contains important information about your rights and our practices regarding your personal data.
              </p>
            </section>

            {/* Section 15 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-medium text-white mb-4">15. Changes to These Terms</h2>
              <p className="text-base leading-[1.6em] mb-3">
                We reserve the right to update these Terms from time to time at our sole discretion to reflect changes in our Service, legal requirements, or business practices. We may modify these Terms at any time, with or without notice.
              </p>
              <p className="text-base leading-[1.6em] mb-3">
                When we make material changes, we will:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-3">
                <li>Notify you via email (if you have an account) or through a prominent notice on the Service</li>
                <li>Update the "Last updated" date at the top of this page</li>
                <li>Provide at least 30 days' notice for material changes that negatively affect your rights</li>
              </ul>
              <p className="text-base leading-[1.6em]">
                <strong>Your continued use of the Service after changes become effective constitutes your acceptance of the updated Terms.</strong> If you do not agree to the updated Terms, you must stop using the Service immediately and may cancel your account. Your continued use of the Service following the posting of changes constitutes your acceptance of such changes, regardless of whether you have reviewed the updated Terms.
              </p>
            </section>

            {/* Section 16 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-medium text-white mb-4">16. Governing Law and Dispute Resolution</h2>
              <p className="text-base leading-[1.6em] mb-3">
                These Terms are governed by and construed in accordance with the laws of <strong>New Zealand</strong>, without regard to conflict of law principles. Any disputes, claims, or controversies arising out of or related to these Terms or the Service shall be subject to the <strong>exclusive jurisdiction</strong> of the courts of New Zealand, or, at Runwise's sole discretion, through binding arbitration conducted in New Zealand in accordance with New Zealand arbitration laws.
              </p>
              <p className="text-base leading-[1.6em] mb-3">
                Before filing a claim, you agree to first contact us at <a href="mailto:hello@runwiseai.app" className="text-[#bd28b3] hover:underline">hello@runwiseai.app</a> to attempt to resolve the dispute informally. If we cannot resolve the dispute within 60 days, either party may proceed with formal legal action in accordance with this section.
              </p>
              <p className="text-base leading-[1.6em]">
                You agree that any dispute resolution proceedings will be conducted only on an individual basis and not in a class, consolidated, or representative action. If any provision of this section is found to be unenforceable, the remaining provisions will remain in full effect.
              </p>
            </section>

            {/* Section 17 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-medium text-white mb-4">17. General Provisions</h2>
              <div className="space-y-3">
                <p className="text-base leading-[1.6em]">
                  <strong>Entire Agreement:</strong> These Terms, together with our Privacy Policy and any additional agreements you enter into with us, constitute the entire agreement between you and Runwise regarding the Service and supersede all prior agreements and understandings.
                </p>
                <p className="text-base leading-[1.6em]">
                  <strong>Severability:</strong> If any provision of these Terms is found to be invalid, illegal, or unenforceable, the remaining provisions will continue in full force and effect, and the invalid provision will be modified to the minimum extent necessary to make it valid and enforceable.
                </p>
                <p className="text-base leading-[1.6em]">
                  <strong>Waiver:</strong> Our failure to enforce any provision of these Terms does not constitute a waiver of that provision or any other provision. Any waiver must be in writing and signed by an authorized representative of Runwise.
                </p>
                <p className="text-base leading-[1.6em]">
                  <strong>Assignment:</strong> You may not assign or transfer these Terms or your account without our prior written consent. We may assign or transfer these Terms or our rights and obligations hereunder without restriction.
                </p>
                <p className="text-base leading-[1.6em]">
                  <strong>Force Majeure:</strong> We are not liable for any failure or delay in performance under these Terms due to circumstances beyond our reasonable control, including but not limited to natural disasters, war, terrorism, labor disputes, internet outages, or government actions.
                </p>
              </div>
            </section>

            {/* Section 18 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-medium text-white mb-4">18. Contact Information</h2>
              <p className="text-base leading-[1.6em] mb-3">
                For questions, concerns, or legal notices regarding these Terms, please contact us at:
              </p>
              <div className="bg-[#ffffff08] border border-[#ffffff1a] rounded-lg p-6 backdrop-blur-sm">
                <p className="text-base leading-[1.6em] mb-2">
                  <strong className="text-white">Runwise</strong>
                </p>
                <p className="text-base leading-[1.6em] mb-2">
                  Email: <a href="mailto:hello@runwiseai.app" className="text-[#bd28b3] hover:underline">hello@runwiseai.app</a>
                </p>
                <p className="text-base leading-[1.6em]">
                  Phone: <a href="tel:+640223591512" className="text-[#bd28b3] hover:underline">+64 022 359 1512</a>
                </p>
              </div>
            </section>

            {/* Acceptance */}
            <section className="pt-8 border-t border-[#ffffff1a]">
              <p className="text-base leading-[1.6em] text-[#ffffffcc]">
                By using Runwise, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions. If you do not agree to these Terms, you must not use the Service.
              </p>
            </section>

          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

