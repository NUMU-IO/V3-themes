/**
 * Fixtures for `npm run dev` ONLY.
 *
 * The dev harness in main.tsx mounts the bundle with no storefront behind it,
 * so without these every template renders its empty state and the layout that
 * took the work is invisible. Everything here is imported inside an
 * `import.meta.env.DEV` branch, so Rollup drops the whole module from both the
 * client and the SSR bundle — check `dist/theme.js` for "Rufus" if you ever
 * doubt it.
 *
 * Covers are generated SVG data URIs, not links to real jackets: a theme repo
 * has no business hotlinking a publisher's artwork, and a flat colour with the
 * title on it proves the grid geometry just as well as a photograph does.
 *
 * ⚠ Prices follow the real contract, deliberately, so the harness would catch
 * a units bug rather than hide one: `product.price` is MAJOR units and
 * `variant.price.amount` is CENTS.
 */

function cover(title: string, bg: string, fg: string, ratio = 0.66): string {
  const height = 600;
  const width = Math.round(height * ratio);
  const words = title.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if ((line + " " + word).trim().length > 12) {
      lines.push(line.trim());
      line = word;
    } else {
      line = `${line} ${word}`;
    }
  }
  if (line.trim()) lines.push(line.trim());

  const text = lines
    .map(
      (l, i) =>
        `<text x="50%" y="${44 + i * 11}%" fill="${fg}" font-family="Georgia,serif" font-size="34" text-anchor="middle">${l
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")}</text>`,
    )
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="${bg}"/><rect x="10" y="10" width="${
    width - 20
  }" height="${height - 20}" fill="none" stroke="${fg}" stroke-opacity="0.35"/>${text}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

interface DevBook {
  id: string;
  slug: string;
  name: string;
  author: string;
  category: string;
  tags: string[];
  /** MAJOR units — the product-level convention. */
  price: number;
  compare_at_price?: number;
  product_type: string;
  bg: string;
  fg: string;
  ratio?: number;
  /** [label, condition, cents, stock] */
  editions: Array<[string, string, number, number]>;
}

const BOOKS: DevBook[] = [
  {
    id: "b1",
    category: "Fiction",
    tags: ["Young adult", "Contemporary"],
    slug: "they-both-die-at-the-end",
    name: "They Both Die at the End",
    author: "Adam Silvera",
    price: 8.95,
    compare_at_price: 12.99,
    product_type: "Used Trade Paperback",
    bg: "#1b2a5e",
    fg: "#e9e6f5",
    ratio: 0.72,
    editions: [
      ["Trade Paperback", "Very good — light shelf wear, clean pages", 895, 4],
      ["Hardcover", "Good — dust jacket has a small tear", 1450, 1],
    ],
  },
  {
    id: "b2",
    category: "Fiction",
    tags: ["Contemporary", "Book club"],
    slug: "the-midnight-library",
    name: "The Midnight Library",
    author: "Matt Haig",
    price: 17.95,
    compare_at_price: 25.0,
    product_type: "Used Hardcover",
    bg: "#10224a",
    fg: "#e9c46a",
    editions: [["Hardcover", "Like new", 1795, 2]],
  },
  {
    id: "b3",
    category: "Fiction",
    tags: ["Fantasy", "Humour"],
    slug: "good-omens",
    name: "Good Omens",
    author: "Terry Pratchett and Neil Gaiman",
    price: 6.5,
    compare_at_price: 8.99,
    product_type: "Used Mass Market",
    bg: "#f3eff9",
    fg: "#2b2723",
    editions: [
      ["Mass Market", "Acceptable — cracked spine, all pages present", 650, 6],
      ["Trade Paperback", "Very good", 1100, 2],
    ],
  },
  {
    id: "b4",
    category: "Fiction",
    tags: ["Historical", "Book club"],
    slug: "pachinko",
    name: "Pachinko",
    author: "Min Jin Lee",
    price: 8.5,
    compare_at_price: 17.99,
    product_type: "Used Trade Paperback",
    bg: "#a9c9e6",
    fg: "#1d2a3d",
    editions: [["Trade Paperback", "Good", 850, 3]],
  },
  {
    id: "b5",
    category: "Fiction",
    tags: ["Contemporary", "Humour"],
    slug: "anxious-people",
    name: "Anxious People",
    author: "Fredrik Backman",
    price: 11.95,
    compare_at_price: 17.0,
    product_type: "Used Trade Paperback",
    bg: "#e8913c",
    fg: "#ffffff",
    editions: [["Trade Paperback", "Very good", 1195, 5]],
  },
  {
    id: "b6",
    category: "Science Fiction",
    tags: ["Dystopian", "Book club"],
    slug: "parable-of-the-sower",
    name: "Parable of the Sower",
    author: "Octavia E. Butler",
    price: 9.95,
    compare_at_price: 17.99,
    product_type: "Used Trade Paperback",
    bg: "#f0e4d6",
    fg: "#4a2a30",
    editions: [["Trade Paperback", "Very good", 995, 2]],
  },
  {
    id: "b7",
    category: "Fiction",
    tags: ["Short stories", "Contemporary"],
    slug: "this-is-how-you-lose-her",
    name: "This Is How You Lose Her",
    author: "Junot Díaz",
    price: 7.5,
    compare_at_price: 16.0,
    product_type: "Used Trade Paperback",
    bg: "#6f4499",
    fg: "#f5e4a8",
    editions: [["Trade Paperback", "Good", 750, 1]],
  },
  {
    id: "b8",
    category: "Fiction",
    tags: ["Historical", "Book club"],
    slug: "cloud-cuckoo-land",
    name: "Cloud Cuckoo Land",
    author: "Anthony Doerr",
    price: 12.95,
    compare_at_price: 18.0,
    product_type: "Used Trade Paperback",
    bg: "#2f6fb2",
    fg: "#f6e3b0",
    editions: [
      ["Trade Paperback", "Very good", 1295, 3],
      ["Hardcover", "Like new — signed by the author", 2400, 1],
    ],
  },
  {
    id: "b9",
    category: "Science Fiction",
    tags: ["Fantasy", "Romance"],
    slug: "a-court-of-thorns-and-roses",
    name: "A Court of Thorns and Roses",
    author: "Sarah J. Maas",
    price: 9.5,
    compare_at_price: 19.0,
    product_type: "Used Trade Paperback",
    bg: "#a81a5e",
    fg: "#f0c878",
    editions: [["Trade Paperback", "Good", 950, 7]],
  },
  {
    id: "b10",
    category: "Local Interest",
    tags: ["Portland", "Travel"],
    slug: "portland-a-book-of-dates",
    name: "Portland: A Book of Dates",
    author: "Jen Stevenson",
    price: 10.5,
    compare_at_price: 19.95,
    product_type: "Used Trade Paperback",
    bg: "#5f9c63",
    fg: "#f6f2e6",
    editions: [["Trade Paperback", "Very good", 1050, 2]],
  },
];

function toProduct(book: DevBook) {
  const image = cover(book.name, book.bg, book.fg, book.ratio);
  return {
    id: book.id,
    slug: book.slug,
    name: book.name,
    // `brand` is where a bookseller puts the author — same field the Meta feed
    // and Product JSON-LD read. See productAuthor() in lib/shared.
    brand: book.author,
    description:
      "<p>A fixture synopsis, standing in for the merchant's own copy so the " +
      "typography below the fold is real. Two paragraphs, because one never " +
      "shows a wrapping problem.</p><p>The second paragraph exists to prove " +
      "the 65-character measure holds and that the spacing between blocks is " +
      "the spacing the design asked for.</p>",
    price: book.price,
    compare_at_price: book.compare_at_price,
    product_type: book.product_type,
    category: { id: book.category.toLowerCase().replace(/\s+/g, "-"), name: book.category },
    tags: book.tags,
    created_at: `2026-0${(Number(book.id.slice(1)) % 9) + 1}-12T00:00:00Z`,
    images: [image],
    image_url: image,
    variants: book.editions.map(([label, condition, cents, stock], i) => ({
      id: `${book.id}-v${i + 1}`,
      product_id: book.id,
      sku: `${book.id.toUpperCase()}-${i + 1}`,
      // CENTS. The product above is in major units; both live in one payload
      // on purpose so the harness exercises the conversion rather than hiding
      // it behind a single unit.
      price: { amount: cents, currency: "USD" },
      inventory_quantity: stock,
      option_values: { Format: label, Condition: condition },
    })),
    options: [
      { name: "Format", position: 1, values: book.editions.map((e) => e[0]) },
      { name: "Condition", position: 2, values: book.editions.map((e) => e[1]) },
    ],
    metafields: [
      { namespace: "books", key: "author", value: book.author },
      { namespace: "books", key: "isbn", value: `978${book.id.replace(/\D/g, "")}0457806` },
      { namespace: "books", key: "publisher", value: "Fixture Press" },
      { namespace: "books", key: "pages", value: "384" },
      { namespace: "books", key: "language", value: "English" },
      { namespace: "books", key: "rating", value: "4.2" },
      { namespace: "books", key: "rating_count", value: "1847" },
      { namespace: "books", key: "shelf_location", value: "Burnside, Blue Room" },
      {
        namespace: "books",
        key: "staff_pick",
        value:
          "One impossible premise, and it refuses every cheap way out of it. I sold my own copy twice and bought it back both times.",
      },
      { namespace: "books", key: "staff_pick_by", value: "Renee, Blue Room" },
    ],
  };
}

export const DEV_PRODUCTS = BOOKS.map(toProduct);

export const DEV_COLLECTIONS = [
  { id: "c1", slug: "used-books", name: "Used Books", description: "" },
  { id: "c2", slug: "staff-picks", name: "Staff Picks", description: "" },
];

export const DEV_CART = {
  id: "dev-cart",
  currency: "USD",
  // MAJOR units, matching normalizeCartFromServer.
  subtotal: 35.4,
  total: 35.4,
  discount_amount: 0,
  items: [
    {
      id: "l1",
      product_id: "b1",
      variant_id: "b1-v1",
      name: "They Both Die at the End",
      variant_name: "Trade Paperback · Very good",
      image_url: DEV_PRODUCTS[0].image_url,
      price: 8.95,
      quantity: 1,
    },
    {
      id: "l2",
      product_id: "b4",
      variant_id: "b4-v1",
      name: "Pachinko",
      variant_name: "Trade Paperback · Good",
      image_url: DEV_PRODUCTS[3].image_url,
      price: 8.5,
      quantity: 1,
    },
    {
      id: "l3",
      product_id: "b2",
      variant_id: "b2-v1",
      name: "The Midnight Library",
      variant_name: "Hardcover · Like new",
      image_url: DEV_PRODUCTS[1].image_url,
      price: 17.95,
      quantity: 1,
    },
  ],
};

/** The `page` payload the host would ship for a given template. */
export function devPage(template: string, slug?: string) {
  switch (template) {
    case "product": {
      const product =
        DEV_PRODUCTS.find((p) => p.slug === slug) ?? DEV_PRODUCTS[0];
      return { type: "product", handle: product.slug, title: product.name, data: { product } };
    }
    case "collection":
    case "products":
    case "collections":
    case "home":
      return {
        type: "collection",
        handle: "used-books",
        title: "Used Books",
        data: {
          products: DEV_PRODUCTS,
          collections: DEV_COLLECTIONS,
          // The collection itself, so useListingHeading resolves the real
          // shelf name instead of falling back to the section setting.
          collection: DEV_COLLECTIONS[0],
        },
      };
    case "search":
      return { type: "search", title: "Search", data: { products: DEV_PRODUCTS } };
    default:
      // /cart, /checkout and 404 genuinely ship no data — the harness must
      // reproduce that, or a section that wrongly reads page.data would pass
      // here and fail on the real storefront.
      return { type: template, title: template };
  }
}
