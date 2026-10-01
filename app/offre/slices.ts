/**
 * The ad page is the designer's picture (1000 × 14 999 px), cut into slices at
 * points between its buttons (public/images/offre/slice-NN.webp). Each slice
 * says what it shows — for screen readers and search engines, which cannot
 * read the picture — and where its buttons are drawn, in % of the slice, so a
 * link sits on its button at any screen width. Physical left/top: the picture
 * itself is never mirrored, even on a right-to-left page.
 */

export interface OfferButton {
  /** `order`: the order page. `offer`: the « عرض ما يتفوتش » section on this page. */
  to: 'order' | 'offer';
  /** The button's words, as drawn. */
  label: string;
  box: { top: number; height: number; left: number; width: number };
}

export interface OfferSlice {
  src: string;
  width: number;
  height: number;
  alt: string;
  /** The slice that opens the offer: « شوف العرض » scrolls here. */
  anchor?: string;
  buttons: OfferButton[];
}

export const OFFER_ANCHOR = 'offre';

const slice = (n: number, height: number, alt: string, buttons: OfferButton[] = [], anchor?: string): OfferSlice => ({
  src: `/images/offre/slice-${String(n).padStart(2, '0')}.webp`,
  width: 1000,
  height,
  alt,
  buttons,
  anchor,
});

export const OFFER_SLICES: OfferSlice[] = [
  slice(
    1,
    1500,
    'AutoLink: سيارتك غالقة الطريق وانت بعيد؟ خلّي الناس يتواصلو معاك ورقمك مخبي. ملصق QR على زجاج السيارة، الدفع عند الاستلام، توصيل لكل الولايات.',
    [
      {
        to: 'order',
        label: 'اطلب ضرك — الدفع عند الاستلام',
        box: { top: 75.27, height: 12.13, left: 17.2, width: 65 },
      },
    ],
  ),
  slice(
    2,
    1500,
    'مواقف صراتلك أكيد: خلّيت الضو شاعل، واحد سادّ عليك وما لقيتش مولاه، الطاقة محلولة والشتا تصب، لافوريار جاية تدي سيارتك. وكل مرة نفس المشكل.',
  ),
  slice(
    3,
    1500,
    'الطريقة القديمة فيها خطر و AutoLink أأمن بزاف: رقمك قدام الناس كامل ومكالمات وإزعاج، مقابل رقمك مخبي، تواصل آمن وستايل عصري.',
  ),
  slice(
    4,
    1500,
    'رقمك ما يبانش؟ خلّي الناس تتواصل معاك بسهولة: ملصق AutoLink على زجاج السيارة، الدفع عند الاستلام، توصيل مجاني لـ 58 ولاية.',
    [{ to: 'order', label: 'اطلب الآن — خلص كي يوصلك', box: { top: 82.13, height: 8.13, left: 16.3, width: 67.1 } }],
  ),
  slice(
    5,
    1500,
    'كيف يخدم؟ 3 خطوات وبرك: لصّق الستيكر على زجاج السيارة، أي واحد يسكاني ويختار سبب التواصل، يوصلك الخبر ورقمك ما يبانش.',
    [{ to: 'order', label: 'اطلب ملصقك ضرك', box: { top: 83.8, height: 9.93, left: 17.7, width: 64.5 } }],
  ),
  slice(
    6,
    1500,
    'رقمك ما يبان لحتى واحد: الناس يتواصلو معاك بلا ما يشوفو رقمك. خصوصية كاملة، مناسب لكل السيارات، سهل التركيب، بلا تطبيق.',
    [{ to: 'order', label: 'اطلب عرضك الآن', box: { top: 82.53, height: 10.8, left: 13.8, width: 72.6 } }],
  ),
  slice(
    7,
    1500,
    'علاش AutoLink يعجبك؟ كلش واضح وبسيط: بلا تطبيق، يجي لكل السيارات، سهل التركيب، تصميم أنيق، آمن وموثوق.',
    [{ to: 'order', label: 'اطلب ضرك', box: { top: 84.47, height: 10.4, left: 17.6, width: 64.4 } }],
  ),
  slice(
    8,
    1460,
    'شكون يقدر يستفاد؟ AutoLink مناسب لكل واحد يركن بزاف: العائلات، النساء، الطاكسي و VTC، أصحاب الشركات، لي يركنو فالمدينة.',
    [{ to: 'offer', label: 'شوف العرض', box: { top: 86.71, height: 10.62, left: 18, width: 64.6 } }],
  ),
  slice(
    9,
    1440,
    'عرض ما يتفوتش: ملصق AutoLink، توصيل مجاني لـ 58 ولاية، الدفع عند الاستلام، رقمك مخبي، بلا تطبيق.',
    [{ to: 'order', label: 'اطلب ضرك — خلص كي يوصلك', box: { top: 84.38, height: 9.31, left: 16.4, width: 67.2 } }],
    OFFER_ANCHOR,
  ),
  slice(
    10,
    1599,
    'أسئلة تتعاود بزاف: واش لازم تطبيق؟ لا، يكفي تسكاني الكود. رقمي يبان؟ لا، يبقى مخبي. يجي لسيارتي؟ يجي لكل السيارات. ما تستناش المشكل يصر: ركّب AutoLink وخلّي التواصل ساهل.',
    [{ to: 'order', label: 'اطلب AutoLink ضرك', box: { top: 87.05, height: 7.5, left: 14.1, width: 71.7 } }],
  ),
];
