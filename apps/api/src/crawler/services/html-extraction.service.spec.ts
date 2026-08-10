import { HtmlExtractionService } from './html-extraction.service';
import { StructuredDataService } from './structured-data.service';
import { ImageMetadataService } from './image-metadata.service';
import { UrlNormalizationService } from './url-normalization.service';

describe('HtmlExtractionService', () => {
  let service: HtmlExtractionService;
  let urlNorm: UrlNormalizationService;

  beforeEach(() => {
    urlNorm = new UrlNormalizationService();
    service = new HtmlExtractionService(
      new StructuredDataService(),
      new ImageMetadataService(),
      urlNorm
    );
  });

  it('should extract title and meta description', () => {
    const html = `
      <html>
        <head>
          <title>Test Page</title>
          <meta name="description" content="This is a test description">
        </head>
        <body><p>Hello world</p></body>
      </html>
    `;
    const result = service.extract(html, 'https://example.com');
    expect(result.title).toBe('Test Page');
    expect(result.metaDescription).toBe('This is a test description');
    expect(result.cleanedHtml).toContain('Hello world');
  });

  it('should remove scripts and styles', () => {
    const html = `
      <html>
        <body>
          <script>alert(1);</script>
          <style>body { color: red; }</style>
          <p>Visible Content</p>
        </body>
      </html>
    `;
    const result = service.extract(html, 'https://example.com');
    expect(result.cleanedHtml).not.toContain('alert(1)');
    expect(result.cleanedHtml).not.toContain('color: red');
    expect(result.cleanedHtml).toContain('Visible Content');
  });

  it('should extract same-origin internal links', () => {
    const html = `
      <html>
        <body>
          <a href="/about">About</a>
          <a href="https://example.com/contact">Contact</a>
          <a href="https://google.com">Google</a>
          <a href="#section2">Section 2</a>
        </body>
      </html>
    `;
    const result = service.extract(html, 'https://example.com');
    expect(result.internalLinks).toContain('https://example.com/about');
    expect(result.internalLinks).toContain('https://example.com/contact');
    expect(result.internalLinks).not.toContain('https://google.com');
  });

  it('should flag requiresRendering for empty or extremely low content pages', () => {
    const emptyHtml = `<html><body><div id="root"></div></body></html>`;
    const result = service.extract(emptyHtml, 'https://example.com');
    expect(result.requiresRendering).toBe(true);

    const normalHtml = `
      <html>
        <body>
          <h1>A meaningful page</h1>
          <p>This is a long paragraph of text that contains enough words to represent actual meaningful content on the website. We want to make sure it doesn't get marked as requiring client-side rendering.</p>
        </body>
      </html>
    `;
    const normalResult = service.extract(normalHtml, 'https://example.com');
    expect(normalResult.requiresRendering).toBe(false);
  });
});
