import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { OpenCartConnector } from './opencart.connector';
import { SafeFetchService, FetchResult } from '../../crawler/services/safe-fetch.service';
import { StockStatus } from '@chatbot-platform/shared-types';

describe('OpenCartConnector', () => {
  let connector: OpenCartConnector;
  let mockSafeFetch: { fetchSafe: Mock } | unknown;

  const samplePrintezJson = [
    {
      productId: '127',
      name: 'Carbonless Packing List Forms',
      description: 'PrintEZ product: Carbonless Packing List Forms. Section: By Business Type.',
      price: '$141.99',
      category: 'By Business Type',
      url: 'https://www.printez.com/carbonless-packing-list-forms.html',
    },
    {
      productId: 'R6520',
      name: 'Delivery Receipt Forms',
      description: 'PrintEZ product: Delivery Receipt Forms. Section: Carbon Copy Bill of Lading.',
      price: '$0.00',
      category: 'Carbon Copy Bill of Lading',
      url: 'https://www.printez.com/delivery-receipt-forms.html',
    },
  ];

  beforeEach(() => {
    mockSafeFetch = {
      fetchSafe: vi.fn(),
    };
  });

  describe('fetchProducts (flat array export)', () => {
    it('should fetch and map PrintEZ array products correctly', async () => {
      const fetchMock = (mockSafeFetch as { fetchSafe: Mock }).fetchSafe.mockResolvedValue({
        content: JSON.stringify(samplePrintezJson),
        contentType: 'application/json',
        status: 200,
        finalUrl: 'https://www.printez.com/api/products?page=1&limit=500',
      } as FetchResult);

      connector = new OpenCartConnector(
        { apiBaseUrl: 'https://www.printez.com' },
        mockSafeFetch as SafeFetchService,
      );

      const result = await connector.fetchProducts(1, 500);

      expect(fetchMock).toHaveBeenCalledWith(
        'https://www.printez.com/api/products?page=1&limit=500',
        'https://www.printez.com',
      );
      expect(result.products).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      expect(result.hasMore).toBe(false);

      // Product 1 verification
      expect(result.products[0]).toEqual({
        externalId: '127',
        name: 'Carbonless Packing List Forms',
        description: 'PrintEZ product: Carbonless Packing List Forms. Section: By Business Type.',
        price: 141.99,
        compareAtPrice: null,
        discountPercent: null,
        currency: 'USD',
        brand: null,
        categoryExternalId: 'by-business-type',
        categoryName: 'By Business Type',
        stockQuantity: null,
        stockStatus: StockStatus.IN_STOCK,
        shippingInfo: null,
        images: [],
        productUrl: 'https://www.printez.com/carbonless-packing-list-forms.html',
        metadata: null,
      });

      // Product 2 ($0.00 price verification -> CALL_FOR_PRICE)
      expect(result.products[1].price).toBe(0);
      expect(result.products[1].stockStatus).toBe(StockStatus.CALL_FOR_PRICE);
      expect(result.categories).toHaveLength(2);
    });
  });

  describe('fetchProducts (paginated API response)', () => {
    it('should handle paginated response objects with meta tags', async () => {
      const paginatedData = {
        data: [
          { id: 'PROD1', title: 'Blue Mug', unit_price: '19.99', stock: 15, category: 'Drinkware' },
        ],
        meta: { total: 50, page: 1, lastPage: 5 },
      };

      (mockSafeFetch as { fetchSafe: Mock }).fetchSafe.mockResolvedValue({
        content: JSON.stringify(paginatedData),
        status: 200,
      } as FetchResult);

      connector = new OpenCartConnector(
        { apiBaseUrl: 'https://store.local' },
        mockSafeFetch as SafeFetchService,
      );

      const result = await connector.fetchProducts(1, 10);
      expect(result.products).toHaveLength(1);
      expect(result.products[0].externalId).toBe('PROD1');
      expect(result.products[0].name).toBe('Blue Mug');
      expect(result.products[0].price).toBe(19.99);
      expect(result.products[0].stockQuantity).toBe(15);
      expect(result.hasMore).toBe(true);
      expect(result.totalCount).toBe(50);
    });
  });

  describe('getOrderStatus', () => {
    it('should return live order details without storing them', async () => {
      const orderJson = {
        order_id: 'ORD-9988',
        status: 'In Transit',
        items: [{ name: 'Custom Banners', quantity: 2, price: '45.00' }],
        total: '$90.00',
        tracking_number: '1Z9999999999999999',
      };

      (mockSafeFetch as { fetchSafe: Mock }).fetchSafe.mockResolvedValue({
        content: JSON.stringify(orderJson),
        status: 200,
      } as FetchResult);

      connector = new OpenCartConnector(
        { apiBaseUrl: 'https://www.printez.com' },
        mockSafeFetch as SafeFetchService,
      );

      const order = await connector.getOrderStatus('ORD-9988');
      expect(order).toEqual({
        orderId: 'ORD-9988',
        status: 'In Transit',
        items: [{ name: 'Custom Banners', quantity: 2, price: 45 }],
        total: 90,
        shippingStatus: null,
        trackingNumber: '1Z9999999999999999',
        estimatedDelivery: null,
        currency: 'USD',
      });
    });

    it('should return null on network error or HTTP 404', async () => {
      (mockSafeFetch as { fetchSafe: Mock }).fetchSafe.mockResolvedValue({
        status: 404,
        error: 'Not Found',
      } as FetchResult);

      connector = new OpenCartConnector(
        { apiBaseUrl: 'https://www.printez.com' },
        mockSafeFetch as SafeFetchService,
      );

      const order = await connector.getOrderStatus('UNKNOWN-ID');
      expect(order).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should gracefully return empty result when API request fails', async () => {
      (mockSafeFetch as { fetchSafe: Mock }).fetchSafe.mockResolvedValue({
        content: null,
        error: 'Internal Server Error',
        status: 500,
        contentType: 'application/json',
        finalUrl: 'https://broken.store',
      } as unknown as FetchResult);

      connector = new OpenCartConnector(
        { apiBaseUrl: 'https://broken.store' },
        mockSafeFetch as SafeFetchService,
      );

      const result = await connector.fetchProducts(1, 100);
      expect(result.products).toEqual([]);
      expect(result.hasMore).toBe(false);
    }, 15000);
  });

  describe('authentication headers (PrintEZ API key support)', () => {
    it('should pass Authorization header when apiKey is provided in connectorConfig', async () => {
      const fetchMock = (mockSafeFetch as { fetchSafe: Mock }).fetchSafe.mockResolvedValue({
        content: JSON.stringify([]),
        status: 200,
      } as FetchResult);

      connector = new OpenCartConnector(
        {
          apiBaseUrl: 'https://www.printez.com',
          apiKey: 'Bearer 5c4faefcfc742ee848f1aa2f385f237aec5e70c6fcd7d5b3c8e082e426c51b54',
          endpoints: {
            products: '/index.php?route=agentapi/product|list',
          },
        },
        mockSafeFetch as SafeFetchService,
      );

      await connector.fetchProducts(6, 500);

      expect(fetchMock).toHaveBeenCalledWith(
        'https://www.printez.com/index.php?route=agentapi/product|list&page=6&limit=500',
        'https://www.printez.com',
        {
          Authorization: 'Bearer 5c4faefcfc742ee848f1aa2f385f237aec5e70c6fcd7d5b3c8e082e426c51b54',
        },
      );
    });
  });
});

