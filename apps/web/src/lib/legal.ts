// Draft: change the version when the owner approves revised policy text.
// Removing ".draft" also removes the draft notice and lets search engines index the pages.
// Keep in step with apps/api/src/legal/legal-acceptance.ts.
export const LEGAL_POLICY_VERSION = "2026-11-06.draft";
export const LEGAL_POLICY_IS_DRAFT = LEGAL_POLICY_VERSION.endsWith(".draft");
export const SHOP_CONTACT = {
  brand: "Thiên Phúc",
  email: "Hoan64735@gmail.com",
  phone: "0356176878",
  address: "153 Lý Thái Tổ, Hương Trà, Thành phố Huế",
} as const;
export const legalAcceptance = () => ({
  accepted: true as const,
  version: LEGAL_POLICY_VERSION,
});
export const POLICY_KEYS = [
  "privacy",
  "terms",
  "shipping",
  "returns",
  "rights",
] as const;
export type PolicyKey = (typeof POLICY_KEYS)[number];
export const POLICY_TITLES: Record<PolicyKey, { vi: string; en: string }> = {
  privacy: { vi: "Bảo vệ dữ liệu cá nhân", en: "Personal data and privacy" },
  terms: { vi: "Điều kiện giao dịch", en: "Terms of sale" },
  shipping: { vi: "Vận chuyển và thanh toán", en: "Delivery and payment" },
  returns: { vi: "Đổi trả và hoàn tiền", en: "Returns and refunds" },
  rights: {
    vi: "Yêu cầu dữ liệu và khiếu nại",
    en: "Data requests and complaints",
  },
};
export type LegalSection = { title: string; paragraphs: string[] };
export function policySections(key: PolicyKey, en: boolean): LegalSection[] {
  const t = (vi: string, english: string) => (en ? english : vi);
  const section = (
    vi: string,
    english: string,
    ...paragraphs: [string, string][]
  ): LegalSection => ({
    title: t(vi, english),
    paragraphs: paragraphs.map(([v, e]) => t(v, e)),
  });
  const contact = section("Đầu mối liên hệ", "Contact point", [
    `Thông tin liên hệ đang dùng trên website: ${SHOP_CONTACT.brand}; ${SHOP_CONTACT.address}; ${SHOP_CONTACT.email}; ${SHOP_CONTACT.phone}. Tên pháp lý, loại hình kinh doanh, mã số thuế và đầu mối phụ trách dữ liệu cần chủ cửa hàng xác nhận trước khi công bố chính thức.`,
    `Current website contact: ${SHOP_CONTACT.brand}; ${SHOP_CONTACT.address}; ${SHOP_CONTACT.email}; ${SHOP_CONTACT.phone}. The seller must confirm its legal name, business registration, tax ID and data contact before publication.`,
  ]);
  if (key === "privacy")
    return [
      contact,
      section(
        "Dữ liệu và mục đích",
        "Data and purposes",
        [
          "Tài khoản: email, thông tin hồ sơ và phiên đăng nhập để xác thực và quản lý tài khoản qua Supabase Auth. Mật khẩu đi qua dịch vụ xác thực, không được nhập vào chatbot.",
          "Accounts: email, profile and session information support authentication and account management through Supabase Auth. Passwords belong in the authentication flow, never in chat.",
        ],
        [
          "Đặt hàng: tên, số điện thoại, địa chỉ, email nếu có, giỏ hàng và thông tin đơn để xử lý giao dịch, giao hàng và hỗ trợ. Không dùng việc đặt hàng làm đồng ý nhận quảng cáo.",
          "Orders: name, phone, address, optional email, cart and order details support transactions, delivery and customer support. Placing an order does not subscribe you to advertising.",
        ],
        [
          "Liên hệ: họ tên, email, chủ đề và nội dung lời nhắn được dùng để phản hồi yêu cầu. Vui lòng không gửi mật khẩu, số thẻ, giấy tờ định danh hoặc thông tin nhạy cảm không cần thiết.",
          "Contact: name, email, topic and message are used to answer your request. Do not send passwords, card numbers, identity documents or unnecessary sensitive information.",
        ],
      ),
      section("Đề nghị hợp tác", "Partnership enquiries", [
        "Form hợp tác thu họ tên, điện thoại, email, khu vực, kinh nghiệm và nội dung đề nghị, lưu như một yêu cầu liên hệ để trao đổi về hợp tác. Không tự đăng ký người gửi vào danh sách quảng cáo.",
        "The partnership form collects name, phone, email, region, experience and proposal details, stored as a contact enquiry to discuss the proposal. It does not subscribe the sender to advertising.",
      ]),
      section(
        "Dịch vụ nhận dữ liệu",
        "Service providers",
        [
          "Supabase lưu dữ liệu ứng dụng, tài khoản và ảnh. Khi chức năng tương ứng được bật, GHN nhận thông tin cần giao hàng, SMTP gửi email giao dịch, SePay hỗ trợ đối chiếu chuyển khoản và Cloudflare nhận token xác minh form.",
          "Supabase stores application data, accounts and images. When enabled, GHN receives delivery details, SMTP handles transactional email, SePay supports bank-transfer reconciliation and Cloudflare receives form-verification tokens.",
        ],
        [
          "Chat hiển thị rõ trợ lý AI. Server xử lý câu hỏi để tìm sản phẩm; khi Gemini được bật ở chế độ catalog_only, chỉ từ khóa lấy từ tên sản phẩm, ngân sách, ngôn ngữ và danh sách sản phẩm công khai được gửi cho Google. Không chuyển tiếp nguyên văn câu hỏi hay lịch sử chat trong chế độ này.",
          "Chat is labelled as an AI assistant. The server processes your question to find products. When Gemini is enabled with catalog_only, only catalog-derived keywords, budget, locale and public product candidates are sent to Google. Raw questions and chat history are not forwarded in this mode.",
        ],
        [
          "Một số nhà cung cấp có thể xử lý dữ liệu ngoài Việt Nam. Vị trí project Supabase, bên xử lý email, cấu hình lưu trữ và hồ sơ liên quan cần được chủ cửa hàng xác minh; việc thuê VPS Việt Nam không xác định vị trí của các dịch vụ này.",
          "Some providers may process data outside Vietnam. The seller must verify the Supabase project region, email processor, storage settings and related records. A Vietnam-based VPS does not determine these services’ locations.",
        ],
      ),
      section(
        "Cookie, bộ nhớ trình duyệt và phân tích",
        "Cookies, browser storage and analytics",
        [
          "Website sử dụng phiên đăng nhập, giỏ hàng và thông tin checkout để vận hành. Lựa chọn “Ghi nhớ” trên trang đăng nhập lưu email trên thiết bị. Chat mới chỉ giữ hội thoại trong bộ nhớ trang; nút xóa chat cũng xóa bản lịch sử cũ trên thiết bị nếu có.",
          "The site uses login sessions, cart and checkout information to operate. The login “Remember me” option saves your email on the device. New chat conversations stay in page memory; clearing chat also removes any previous stored history on this device.",
        ],
        [
          "Phân tích tùy chọn chỉ hoạt động sau lựa chọn đồng ý, theo chế độ được bật. Bạn có thể từ chối hoặc thay đổi lựa chọn ở “Quyền riêng tư phân tích”; việc từ chối không ngăn mua hàng. Khi đang tắt, website không hiển thị banner xin đồng ý cho chức năng phân tích đó.",
          "Optional analytics requires consent and an enabled collection mode. Decline or change your choice using “Analytics privacy preferences”; declining does not prevent shopping. When analytics is disabled, its consent banner is not shown.",
        ],
      ),
      section(
        "Lưu trữ và quyền của bạn",
        "Retention and your rights",
        [
          "Thời hạn lưu riêng cho tài khoản, liên hệ, đơn hàng, nhật ký và nghĩa vụ lưu chứng từ: [CHỦ CỬA HÀNG CẦN XÁC NHẬN]. Hiện không có bằng chứng về một lịch xóa tự động chung; bản nháp không cam kết tự xóa sau một số ngày nhất định.",
          "Separate retention periods for accounts, contacts, orders, logs and legally required records: [SELLER CONFIRMATION REQUIRED]. A general automatic deletion schedule has not been established; this draft does not promise deletion after a fixed number of days.",
        ],
        [
          "Bạn có thể yêu cầu được biết, xem, sửa, xóa, hạn chế hoặc phản đối xử lý, rút đồng ý và khiếu nại qua đầu mối ở trên. Việc xử lý yêu cầu cần xác minh người yêu cầu và xét nghĩa vụ lưu trữ áp dụng; không gửi mật khẩu hay OTP để xác minh.",
          "You may request information, access, correction, deletion, restriction, objection, consent withdrawal or complaint handling through the contact above. Requests require identity checks and consideration of applicable retention duties; never send passwords or OTPs for verification.",
        ],
      ),
    ];
  if (key === "terms")
    return [
      contact,
      section(
        "Kiểm tra trước khi đặt hàng",
        "Review before ordering",
        [
          "Kiểm tra sản phẩm, biến thể, số lượng, thông tin người nhận, phương thức nhận hàng, phí vận chuyển, ưu đãi và tổng tiền ở bước xác nhận. Có thể quay lại sửa trước khi bấm đặt hàng. Giá và tồn kho được server kiểm tra lại khi tạo đơn.",
          "Review products, variants, quantities, recipient details, delivery method, delivery fee, discounts and total before placing the order. You can return to edit before submission. The server rechecks prices and stock when creating the order.",
        ],
        [
          "Lựa chọn đồng ý điều kiện giao dịch tách biệt với phân tích và quảng cáo. Mã đơn hoặc mã QR không tự chứng minh đã nhận thanh toán; kiểm tra trạng thái thanh toán của đơn.",
          "Acceptance of sale terms is separate from analytics and advertising consent. An order ID or QR code alone does not prove payment; check the order’s payment status.",
        ],
      ),
      section(
        "Thông tin cần phê duyệt",
        "Details awaiting approval",
        [
          "Thời điểm chấp nhận đơn/hình thành hợp đồng, thời hạn xác nhận, giá đã bao gồm thuế hay chưa, chứng từ bán hàng và điều kiện hủy đơn: [CHỦ CỬA HÀNG CẦN XÁC NHẬN]. Đây là bản nháp phục vụ kiểm thử, chưa phải điều kiện bán hàng được phê duyệt.",
          "Order acceptance/contract formation, confirmation times, whether prices include taxes, sales documents and cancellation rules: [SELLER CONFIRMATION REQUIRED]. This is a testing draft, not approved sale terms.",
        ],
        [
          "Không có điều khoản nào trong bản nháp nhằm loại trừ quyền khiếu nại hoặc quyền được bảo vệ theo pháp luật. Gợi ý từ AI không phải chứng nhận nguồn gốc, chất lượng hay công dụng y tế của sản phẩm.",
          "This draft does not waive complaint or statutory consumer rights. AI suggestions are not certificates of origin, quality or medical effects.",
        ],
      ),
    ];
  if (key === "shipping")
    return [
      section(
        "Phí và phương thức",
        "Fees and methods",
        [
          "Phương thức giao nhận, phí và tổng tiền được hiển thị trong checkout trước khi đặt đơn. Nếu dùng báo giá GHN, báo giá có hạn dùng và cần tính lại khi thay đổi địa chỉ hoặc khi hết hạn.",
          "Delivery options, fees and total are shown in checkout before placing the order. GHN quotes expire and must be refreshed when the address changes or the quote expires.",
        ],
        [
          "Các phương thức trong ứng dụng gồm COD, chuyển khoản SePay và nhận tại cửa hàng tùy luồng checkout được hỗ trợ. Chỉ chuyển tiền theo thông tin hiển thị trong đơn của bạn; không gửi mật khẩu ngân hàng hoặc OTP cho cửa hàng hay chatbot.",
          "Supported checkout flows offer COD, bank transfer through SePay and/or store collection. Use the payment details shown on your order; never share bank passwords or OTPs with the store or chatbot.",
        ],
      ),
      section("Thông tin vận hành cần chốt", "Operational details to confirm", [
        "Phạm vi giao hàng, thời gian xử lý/giao hàng, cách xử lý chậm giao, kiểm hàng, mức phí áp dụng chính thức và địa chỉ nhận tại cửa hàng: [CHỦ CỬA HÀNG CẦN XÁC NHẬN]. Không suy thời gian giao cam kết từ trạng thái thử nghiệm của GHN.",
        "Service areas, processing/delivery estimates, delays, inspection rules, approved rates and collection address: [SELLER CONFIRMATION REQUIRED]. GHN test statuses do not establish delivery commitments.",
      ]),
    ];
  if (key === "returns")
    return [
      section("Gửi yêu cầu đổi trả", "Request a return", [
        `Liên hệ ${SHOP_CONTACT.email} hoặc ${SHOP_CONTACT.phone} với mã đơn, vấn đề gặp phải và ảnh sản phẩm nếu cần. Không gửi số thẻ, mật khẩu hoặc OTP. Cửa hàng cần xem xét yêu cầu trước khi hướng dẫn gửi hàng.`,
        `Contact ${SHOP_CONTACT.email} or ${SHOP_CONTACT.phone} with your order ID, issue and relevant product photos. Do not send card numbers, passwords or OTPs. The store must review the request before providing return instructions.`,
      ]),
      section(
        "Điều kiện cần chủ cửa hàng xác nhận",
        "Conditions awaiting seller approval",
        [
          "Thời hạn yêu cầu, trường hợp được đổi/trả, tình trạng hàng/niêm phong, địa chỉ nhận hàng trả, người chịu phí vận chuyển, phương thức và thời gian hoàn tiền: [CHỦ CỬA HÀNG CẦN XÁC NHẬN]. Bản nháp không tự đặt thời hạn 7/14/30 ngày hoặc cam kết hoàn tiền chưa được phê duyệt.",
          "Request windows, eligibility, product/seal condition, return address, shipping costs, refund methods and processing times: [SELLER CONFIRMATION REQUIRED]. This draft does not invent a 7/14/30-day window or an unapproved refund promise.",
        ],
        [
          "Quy định chính thức cần được công bố trước khi nhận đơn thương mại. Các quyền áp dụng theo pháp luật của người tiêu dùng vẫn được bảo lưu.",
          "Approved rules must be published before commercial orders are accepted. Applicable statutory consumer rights remain unaffected.",
        ],
      ),
    ];
  return [
    contact,
    section(
      "Yêu cầu về dữ liệu hoặc phản ánh đơn hàng",
      "Data requests or order complaints",
      [
        "Gửi yêu cầu qua email hoặc form liên hệ, nêu rõ mục đích: truy cập/sửa/xóa dữ liệu, rút đồng ý, hạn chế xử lý hoặc phản ánh về đơn hàng. Chỉ cung cấp thông tin tối thiểu để tìm đúng hồ sơ; không gửi mật khẩu, OTP hoặc bản chụp giấy tờ không được yêu cầu.",
        "Use email or the contact form and state the purpose: data access/correction/deletion, consent withdrawal, restriction or an order complaint. Provide only what is needed to locate your record; never send passwords, OTPs or unsolicited identity documents.",
      ],
      [
        "Phân tích tùy chọn có thể tắt ngay bằng nút “Quyền riêng tư phân tích”. Với dữ liệu cần duy trì cho giao dịch hoặc nghĩa vụ pháp luật, cửa hàng cần xem xét căn cứ và giải thích phạm vi có thể xử lý yêu cầu.",
        "Optional analytics can be disabled immediately using “Analytics privacy preferences”. For records needed for transactions or legal duties, the seller must assess and explain which parts of a request can be fulfilled.",
      ],
      [
        "Quy trình xác minh, người phụ trách và thời hạn xử lý theo loại yêu cầu cần được hoàn thiện, đối chiếu quy định hiện hành trước khi công bố chính thức. Trang này không tự động xóa tài khoản, đơn hàng hoặc dữ liệu trên dịch vụ bên thứ ba.",
        "Identity checks, responsible staff and processing times by request type must be finalized against applicable rules before publication. This page does not automatically delete accounts, orders or data held by third parties.",
      ],
    ),
  ];
}
