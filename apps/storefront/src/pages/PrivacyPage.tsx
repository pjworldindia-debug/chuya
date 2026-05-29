import { BRAND } from '@chuya/shared/constants'

export default function PrivacyPage() {
  return (
    <div className="pt-24 pb-16 px-6 md:px-12 max-w-4xl mx-auto min-h-screen">
      <h1 className="font-serif text-3xl md:text-5xl mb-8">Privacy Policy</h1>
      <div className="prose prose-sm md:prose-base prose-neutral text-chuya/80 max-w-none space-y-6">
        <p>This Privacy Policy outlines how personal information is collected, used, and safeguarded when you interact with this website. By accessing or using the website, you agree to the practices described below.</p>
        
        <h2 className="text-xl font-bold mt-8 mb-4 text-chuya">1. Information We Collect</h2>
        <p>We may collect the following types of information:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Personal Information:</strong> Name, phone number, email address, billing/shipping address.</li>
          <li><strong>Payment Information:</strong> Used to process orders securely through third-party payment gateways.</li>
          <li><strong>Technical Information:</strong> IP address, browser type, device information, and usage data via cookies or similar technologies.</li>
        </ul>
        
        <h2 className="text-xl font-bold mt-8 mb-4 text-chuya">2. How We Use Your Information</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>To process and deliver orders.</li>
          <li>To send transactional communications such as order updates or shipping alerts.</li>
          <li>To respond to customer inquiries or service requests.</li>
          <li>To improve website functionality, services, and user experience.</li>
          <li>For marketing purposes (only with your explicit consent).</li>
        </ul>
        
        <h2 className="text-xl font-bold mt-8 mb-4 text-chuya">3. Data Sharing</h2>
        <p>We do not sell, rent, or trade your personal data. We may share necessary information with third-party service providers such as payment gateways, delivery partners, or IT service providers — only to fulfill your order or maintain the website. Personal information may be disclosed if required by law or legal proceedings.</p>
        
        <h2 className="text-xl font-bold mt-8 mb-4 text-chuya">4. Data Security</h2>
        <p>We implement reasonable security measures to protect your data from unauthorized access, alteration, or disclosure. However, no online transmission is 100% secure. You acknowledge this risk when using the site.</p>
        
        <h2 className="text-xl font-bold mt-8 mb-4 text-chuya">5. Cookies and Tracking Technologies</h2>
        <p>Cookies are used to personalize your experience, analyze site traffic, and provide relevant ads. You can manage or disable cookies via your browser settings, although this may affect site functionality.</p>
        
        <h2 className="text-xl font-bold mt-8 mb-4 text-chuya">6. Third-Party Links</h2>
        <p>This website may contain links to third-party websites. We are not responsible for the privacy practices or content of those websites.</p>
        
        <h2 className="text-xl font-bold mt-8 mb-4 text-chuya">7. Your Rights</h2>
        <p>You may request access to or correction of your personal data. You may opt out of marketing communications at any time.</p>
        
        <h2 className="text-xl font-bold mt-8 mb-4 text-chuya">8. Changes to This Policy</h2>
        <p>This privacy policy may be updated periodically. Continued use of the website after changes indicates acceptance of the revised policy.</p>
        
        <p className="mt-8 font-medium">Contact - <a href={`mailto:${BRAND.email}`} className="underline underline-offset-4 hover:text-chuya transition-colors">{BRAND.email}</a></p>
        <p className="mt-2 font-medium">
          Phone : +91 {BRAND.whatsapp.replace('91', '')}<br />
          {BRAND.address}
        </p>
      </div>
    </div>
  )
}
