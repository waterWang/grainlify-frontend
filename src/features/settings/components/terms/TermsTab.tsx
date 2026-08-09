import { useState, useRef, type ReactNode } from 'react';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import { useTheme } from '../../../../shared/contexts/ThemeContext';

const LAST_UPDATED = 'August 6, 2026';
const ACCEPTED_STORAGE_KEY = 'grainlify_terms_accepted';

interface SectionData {
  id: string;
  title: string;
  body: ReactNode;
}

// Grounded in what the platform actually does today (GitHub OAuth, Didit KYC,
// points -> USDC-on-Stellar redemption reviewed by an admin, referrals, the
// GitHub App maintainers install) rather than generic SaaS boilerplate.
const SECTIONS: SectionData[] = [
  {
    id: 'acceptance',
    title: 'Acceptance of Terms',
    body: (
      <>
        <p>
          These Terms and Conditions ("Terms") govern access to and use of Grainlify (the "Platform," "we," "us"), a
          platform that connects open source contributors with maintainers and rewards completed contributions with
          points redeemable for cryptocurrency. By creating an account, signing in with GitHub, or otherwise using
          the Platform, you agree to be bound by these Terms and by our Privacy Policy below.
        </p>
        <p>If you do not agree to these Terms, do not create an account or use the Platform.</p>
      </>
    ),
  },
  {
    id: 'eligibility',
    title: 'Eligibility',
    body: (
      <>
        <p>To use Grainlify, you must:</p>
        <ul>
          <li>Be at least 18 years old, or the age of legal majority in your jurisdiction, whichever is greater.</li>
          <li>Have a valid, active GitHub account in good standing.</li>
          <li>Not be located in, or a resident of, a country or region subject to comprehensive sanctions, and not
            appear on any sanctions or restricted-party list (including lists maintained by OFAC, the UN, or the EU).</li>
          <li>Have the legal capacity to enter into a binding agreement.</li>
        </ul>
        <p>We reserve the right to deny or terminate access to anyone who does not meet these criteria.</p>
      </>
    ),
  },
  {
    id: 'the-platform',
    title: 'Description of the Platform',
    body: (
      <>
        <p>Grainlify connects three kinds of participants:</p>
        <ul>
          <li><strong>Contributors</strong>, who browse and apply to open, unassigned issues on listed repositories and earn points for merged work.</li>
          <li><strong>Maintainers</strong>, who list their repositories via GitHub App installation, triage issues, and review and merge contributions.</li>
          <li><strong>Administrators</strong>, who operate the Platform, review redemption requests, and moderate content.</li>
        </ul>
        <p>
          Points are also awarded through supplementary programs at our discretion, including referrals and
          social-follow campaigns. Points may be redeemed for USDC, subject to the redemption process described
          below. The Platform also hosts time-boxed community events (such as "Open Source Week") with their own
          published rules.
        </p>
      </>
    ),
  },
  {
    id: 'account',
    title: 'Account Registration and GitHub Authentication',
    body: (
      <>
        <p>
          Accounts are created and authenticated exclusively through GitHub OAuth. You are responsible for
          maintaining the security of your GitHub account, since anyone with access to it can access your Grainlify
          account. We are not responsible for losses caused by a compromised GitHub account.
        </p>
        <p>
          You agree to provide accurate information where requested (for example, in your billing profile) and to
          keep it up to date. You may not create multiple accounts to circumvent limits, manipulate the leaderboard,
          or claim rewards more than once for the same contribution ("sybil" activity) — see Prohibited Conduct below.
        </p>
      </>
    ),
  },
  {
    id: 'kyc',
    title: 'Identity Verification (KYC) and Anti-Money Laundering',
    body: (
      <>
        <p>
          Before redeeming points for cryptocurrency, you must complete identity verification ("KYC") through our
          third-party verification provider, Didit. During this process you will be asked to submit government-issued
          identification and related personal information directly to that provider.
        </p>
        <p>
          We do not store your raw identity documents; we receive and store a verification status and the minimum
          extracted data needed to administer redemptions (such as your verified name). We may decline, delay, or
          reverse a redemption if verification fails, is incomplete, or if we reasonably suspect fraud, money
          laundering, or sanctions exposure. You authorize us to share information with Didit and, where legally
          required, with regulators or law enforcement.
        </p>
      </>
    ),
  },
  {
    id: 'points-and-redemption',
    title: 'Points, Rewards, and the Redemption Process',
    body: (
      <>
        <p>
          Points are earned for platform activity such as merged contributions, completed referrals, and other
          programs we may introduce or retire at any time. <strong>Points are not currency</strong>, are not
          transferable between accounts, have no cash value on their own, and confer no ownership, equity, or
          claim against Grainlify beyond the ability to request redemption under these Terms.
        </p>
        <p>Redemption works as follows, and may change as the Platform matures:</p>
        <ul>
          <li>Redemption requests are subject to a minimum point threshold, published in the Redeem section of the app.</li>
          <li>The points-to-USDC conversion rate is set by us and may change prospectively at any time; the rate in
            effect at the time you submit a request is the rate applied to that request.</li>
          <li>Requested points are deducted immediately upon submission so the same points cannot fund two requests at once.</li>
          <li>Every redemption is reviewed by an administrator before payout. We may reject a request — refunding
            the points — if verification is incomplete, the wallet address appears invalid, or we suspect abuse.</li>
          <li>Approved redemptions are paid in USDC on the Stellar network to the wallet address you provide. You are
            solely responsible for providing an accurate, Stellar-compatible address; see the next section.</li>
        </ul>
        <p>
          We do not guarantee that points will ever be worth any particular amount, that redemption will be
          instantaneous, or that the Platform will offer redemption indefinitely.
        </p>
      </>
    ),
  },
  {
    id: 'crypto-risk',
    title: 'Cryptocurrency, Wallets, and Blockchain Risk',
    body: (
      <>
        <p>
          Redemptions are currently settled only on the Stellar network, in USDC. Blockchain transactions are
          irreversible. <strong>If you provide an incorrect, incompatible, or unowned wallet address, funds sent to
          that address cannot be recovered by us or anyone else.</strong> You are solely responsible for the accuracy
          of the wallet address you submit and for the custody and security of your own wallet and private keys.
        </p>
        <p>
          Cryptocurrency values can be volatile, and third-party networks, exchanges, or wallet providers may
          experience outages, congestion, or changes in fees outside our control. Nothing on the Platform is
          investment, tax, or financial advice.
        </p>
      </>
    ),
  },
  {
    id: 'maintainer-obligations',
    title: 'Maintainer and Project Obligations',
    body: (
      <>
        <p>If you list a repository as a maintainer, you represent that you have the authority to do so and agree to:</p>
        <ul>
          <li>Install and maintain the Grainlify GitHub App with the permissions it requests, solely for issue,
            pull request, and webhook synchronization.</li>
          <li>Triage and label issues in good faith, including marking issues intended for contributors clearly.</li>
          <li>Review contributor pull requests in a reasonable timeframe and merge or close them with a clear reason.</li>
          <li>Not use the Platform to solicit unpaid work outside the spirit of the points-and-rewards system, or to
            approve contributions you do not intend to merge in order to inflate contributor activity.</li>
        </ul>
        <p>You may uninstall the GitHub App and remove your repositories from the Platform at any time.</p>
      </>
    ),
  },
  {
    id: 'prohibited-conduct',
    title: 'Prohibited Conduct',
    body: (
      <>
        <p>In addition to anything else prohibited in these Terms, you may not:</p>
        <ul>
          <li>Create multiple accounts, or use bots or automation, to farm points, referrals, or leaderboard rank.</li>
          <li>Submit low-effort, plagiarized, AI-generated-without-review, or otherwise bad-faith contributions
            solely to earn points ("spam PRs").</li>
          <li>Collude between a contributor and maintainer account you control to approve self-dealt contributions.</li>
          <li>Attempt to reverse-engineer, disrupt, or gain unauthorized access to the Platform, its infrastructure,
            or other users' accounts.</li>
          <li>Use the Platform for money laundering, terrorist financing, or any other unlawful purpose.</li>
          <li>Misrepresent your identity during KYC verification.</li>
        </ul>
        <p>
          Violating this section may result in point forfeiture, redemption denial, and immediate account
          suspension or termination, in our sole discretion.
        </p>
      </>
    ),
  },
  {
    id: 'ip',
    title: 'Intellectual Property',
    body: (
      <>
        <p>
          Contributions you make to third-party repositories remain governed by that repository's own open source
          license — Grainlify claims no ownership over your code contributions. The Grainlify name, logo, and the
          Platform's own software, design, and content are owned by us or our licensors and may not be copied or
          used without permission, except as necessary to use the Platform as intended.
        </p>
      </>
    ),
  },
  {
    id: 'referrals',
    title: 'Referral and Bonus Programs',
    body: (
      <>
        <p>
          We may offer referral codes, social-follow campaigns, or other promotional programs that award bonus
          points. These programs are optional, may have their own published rules, and may be modified, paused, or
          discontinued at any time. Points earned under a promotional program remain subject to review and may be
          reversed if we determine the underlying activity was fraudulent (for example, self-referrals).
        </p>
      </>
    ),
  },
  {
    id: 'third-party',
    title: 'Third-Party Services and Integrations',
    body: (
      <>
        <p>
          The Platform depends on third-party services we do not control, including GitHub (authentication, issue
          and pull request data), Didit (identity verification), and the Stellar network (settlement). We are not
          responsible for outages, policy changes, or data practices of these third parties, and your use of them
          is also subject to their own terms.
        </p>
      </>
    ),
  },
  {
    id: 'fees-taxes',
    title: 'Fees and Taxes',
    body: (
      <>
        <p>
          We do not currently charge fees to redeem points, though this may change with notice. You are solely
          responsible for determining what, if any, taxes apply to rewards you receive through the Platform in your
          jurisdiction, and for reporting and remitting those taxes. We may be required to collect tax information
          from you (for example, via your billing profile) to comply with applicable law.
        </p>
      </>
    ),
  },
  {
    id: 'disclaimers',
    title: 'Disclaimers and Limitation of Liability',
    body: (
      <>
        <p>
          The Platform is provided "as is" and "as available," without warranties of any kind, express or implied,
          including merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that
          the Platform will be uninterrupted, error-free, or secure.
        </p>
        <p>
          To the fullest extent permitted by law, Grainlify and its operators will not be liable for indirect,
          incidental, special, consequential, or punitive damages, or for lost profits or lost cryptocurrency,
          arising from your use of the Platform — including losses from an incorrectly entered wallet address,
          third-party service outages, or blockchain network issues. Our total liability for any claim arising out
          of these Terms will not exceed the greater of $100 or the amount of points-value you redeemed through the
          Platform in the 12 months before the claim arose.
        </p>
      </>
    ),
  },
  {
    id: 'indemnification',
    title: 'Indemnification',
    body: (
      <>
        <p>
          You agree to indemnify and hold harmless Grainlify and its operators from any claims, damages, or expenses
          (including reasonable legal fees) arising from your violation of these Terms, your misuse of the Platform,
          or content or contributions you submit.
        </p>
      </>
    ),
  },
  {
    id: 'termination',
    title: 'Suspension and Termination',
    body: (
      <>
        <p>
          We may suspend or terminate your access to the Platform at any time, with or without notice, for
          violations of these Terms, suspected fraud, legal or regulatory reasons, or extended inactivity. You may
          stop using the Platform at any time. Redemption requests already approved before termination will still be
          processed; unredeemed points do not entitle you to a cash payout upon termination.
        </p>
      </>
    ),
  },
  {
    id: 'governing-law',
    title: 'Governing Law and Dispute Resolution',
    body: (
      <>
        <p>
          These Terms are governed by the laws of the jurisdiction in which Grainlify's operating entity is
          established, without regard to conflict-of-law principles, unless a different jurisdiction is required by
          applicable local consumer-protection law. Disputes should first be raised with us informally; we will make
          good-faith efforts to resolve them before either party pursues formal proceedings.
        </p>
      </>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to These Terms',
    body: (
      <>
        <p>
          We may update these Terms from time to time. Material changes will be reflected by updating the "Last
          updated" date at the top of this page, and, where practical, we will notify active users. Continued use of
          the Platform after changes take effect constitutes acceptance of the revised Terms.
        </p>
      </>
    ),
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    body: (
      <>
        <p><strong>What we collect.</strong> Your GitHub profile (username, avatar, public profile data), contribution
          activity synced from repositories you interact with through the Platform, points and redemption history,
          billing-profile details you provide, and a verification status (not raw documents) from our KYC provider.</p>
        <p><strong>How we use it.</strong> To operate your account, calculate and display rankings, process
          redemption requests, comply with KYC/AML obligations, prevent fraud, and communicate with you about your
          account.</p>
        <p><strong>Who we share it with.</strong> Didit (for identity verification), infrastructure providers that
          host the Platform, and regulators or law enforcement where legally required. We do not sell your personal
          information.</p>
        <p><strong>Your rights.</strong> You may request a copy of the personal data we hold about you or request its
          deletion, subject to records we are legally required to retain (for example, KYC and redemption records for
          AML compliance). Contact us using the details below to exercise these rights.</p>
        <p><strong>Retention.</strong> We retain account and redemption data for as long as your account is active
          and for a reasonable period afterward to meet legal, tax, and anti-fraud obligations.</p>
      </>
    ),
  },
  {
    id: 'contact',
    title: 'Contact Us',
    body: (
      <>
        <p>
          Questions about these Terms or the Privacy Policy, or requests regarding your personal data, can be sent
          through the support channel linked in the app footer or on our{' '}
          <a href="https://docs.grainlify.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2">
            documentation site<ExternalLink className="w-3 h-3" />
          </a>.
        </p>
      </>
    ),
  },
];

function Section({ id, number, title, isDark, children }: { id: string; number: number; title: string; isDark: boolean; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <div className="flex items-baseline gap-3 mb-3">
        <span className={`text-[13px] font-bold tabular-nums transition-colors ${isDark ? 'text-[#c9983a]' : 'text-[#a67c2e]'}`}>
          {String(number).padStart(2, '0')}
        </span>
        <h3 className={`text-[19px] font-bold transition-colors ${isDark ? 'text-[#f5efe5]' : 'text-[#2d2820]'}`}>{title}</h3>
      </div>
      <div
        className={`text-[14px] leading-relaxed space-y-3 pl-[30px] transition-colors [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_strong]:font-semibold ${
          isDark ? 'text-[#c5b5a2] [&_strong]:text-[#e8dfd0]' : 'text-[#6b5d4d] [&_strong]:text-[#2d2820]'
        }`}
      >
        {children}
      </div>
    </section>
  );
}

export function TermsTab() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [accepted, setAccepted] = useState(() => {
    try {
      return localStorage.getItem(ACCEPTED_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const contentRef = useRef<HTMLDivElement>(null);

  const handleAccept = () => {
    try {
      localStorage.setItem(ACCEPTED_STORAGE_KEY, 'true');
    } catch {
      // Non-fatal - localStorage may be unavailable (private browsing, quota).
    }
    setAccepted(true);
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const cardClass = `backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-colors ${
    isDark ? 'bg-[#2d2820]/[0.4] border-white/10' : 'bg-white/[0.12] border-white/20'
  }`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`${cardClass} p-8`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className={`text-[28px] font-bold mb-2 transition-colors ${isDark ? 'text-[#f5efe5]' : 'text-[#2d2820]'}`}>
              Terms and Conditions
            </h2>
            <p className={`text-[14px] transition-colors ${isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>
              How Grainlify works, what we ask of you, and how we handle your data.
            </p>
          </div>
          <span className={`text-[12px] font-medium px-3 py-1.5 rounded-full border transition-colors ${
            isDark ? 'border-white/15 text-[#b8a898]' : 'border-black/10 text-[#7a6b5a]'
          }`}>
            Last updated {LAST_UPDATED}
          </span>
        </div>
        <div className={`mt-5 text-[12.5px] leading-relaxed rounded-[14px] px-4 py-3 border ${
          isDark ? 'bg-[#c9983a]/[0.08] border-[#c9983a]/20 text-[#d4c5b0]' : 'bg-[#c9983a]/[0.06] border-[#c9983a]/25 text-[#7a6b5a]'
        }`}>
          This document is drafted to describe the Platform's actual features in detail and should be reviewed by
          qualified legal counsel for your jurisdiction and operating entity before being treated as final, binding terms.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 items-start">
        {/* Table of contents */}
        <div className={`${cardClass} p-4 lg:sticky lg:top-6 hidden lg:block`}>
          <p className={`text-[11px] font-bold uppercase tracking-wide px-2 mb-2 transition-colors ${isDark ? 'text-[#8a7e70]' : 'text-[#9a8b7a]'}`}>
            On this page
          </p>
          <nav className="space-y-0.5 max-h-[calc(100vh-260px)] overflow-y-auto scrollbar-hide">
            {SECTIONS.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => scrollToSection(s.id)}
                className={`w-full text-left text-[12.5px] px-2 py-1.5 rounded-[8px] transition-colors ${
                  isDark ? 'text-[#c5b5a2] hover:text-[#f5efe5] hover:bg-white/[0.06]' : 'text-[#6b5d4d] hover:text-[#2d2820] hover:bg-black/[0.04]'
                }`}
              >
                <span className="tabular-nums opacity-60 mr-1.5">{String(idx + 1).padStart(2, '0')}</span>
                {s.title}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div ref={contentRef} className={`${cardClass} p-8 space-y-10`}>
          {SECTIONS.map((s, idx) => (
            <Section key={s.id} id={s.id} number={idx + 1} title={s.title} isDark={isDark}>
              {s.body}
            </Section>
          ))}
        </div>
      </div>

      {/* Acceptance */}
      <div className={`flex items-center justify-between gap-4 flex-wrap ${cardClass} p-8`}>
        <div>
          <h3 className={`text-[16px] font-bold mb-1 transition-colors ${isDark ? 'text-[#f5efe5]' : 'text-[#2d2820]'}`}>
            {accepted ? 'Terms accepted' : 'Accept Terms'}
          </h3>
          <p className={`text-[13px] transition-colors ${isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>
            {accepted
              ? "You've acknowledged the terms above on this device."
              : 'By clicking accept, you acknowledge you have read and agree to the terms and privacy policy above.'}
          </p>
        </div>
        <button
          onClick={handleAccept}
          disabled={accepted}
          className={`px-8 py-3 rounded-[16px] font-semibold text-[15px] transition-all border border-white/10 flex items-center gap-2 ${
            accepted
              ? 'bg-green-600/20 text-green-500 cursor-default border-green-500/30'
              : 'bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white shadow-[0_6px_24px_rgba(162,121,44,0.4)] hover:shadow-[0_8px_28px_rgba(162,121,44,0.5)]'
          }`}
        >
          {accepted && <CheckCircle2 className="w-4 h-4" />}
          {accepted ? 'Accepted' : 'Accept'}
        </button>
      </div>
    </div>
  );
}
