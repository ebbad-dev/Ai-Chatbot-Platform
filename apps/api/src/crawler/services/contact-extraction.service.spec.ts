import { ContactExtractionService } from './contact-extraction.service';

describe('ContactExtractionService', () => {
  let service: ContactExtractionService;

  beforeEach(() => {
    service = new ContactExtractionService();
  });

  it('should extract emails from text and mailto links', () => {
    const html = `
      <html>
        <body>
          <p>Contact us at support@example.com.</p>
          <a href="mailto:sales@example.com">Sales</a>
        </body>
      </html>
    `;
    const result = service.extractContacts(html, 'https://example.com/contact');
    
    const emails = result.filter(c => c.type === 'email').map(c => c.value);
    expect(emails).toContain('support@example.com');
    expect(emails).toContain('sales@example.com');
  });

  it('should extract phones from text and tel links', () => {
    const html = `
      <html>
        <body>
          <p>Call us at 123-456-7890 or 1-800-555-0199.</p>
          <a href="tel:+19876543210">Emergency</a>
        </body>
      </html>
    `;
    const result = service.extractContacts(html, 'https://example.com/contact');
    
    const phones = result.filter(c => c.type === 'phone').map(c => c.value);
    expect(phones).toContain('123-456-7890');
    expect(phones).toContain('1-800-555-0199');
    expect(phones).toContain('+19876543210');
  });
});
