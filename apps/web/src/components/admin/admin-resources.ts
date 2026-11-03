export type Resource =
  | "orders"
  | "products"
  | "categories"
  | "users"
  | "posts"
  | "contacts"
  | "vouchers";
export type Text = readonly [string, string];
export type Choice = { value: string; label: Text };
export type Filter = { key: string; label: Text; options: Choice[] };
export interface AdminRow {
  id: string;
  created_at?: string;
  slug?: string;
  title?: string;
  full_name?: string;
  email?: string;
  status?: string;
  role?: string;
  is_banned?: boolean;
  is_active?: boolean;
  is_featured?: boolean;
  price?: number;
  quantity?: number;
  total?: number;
  payment_status?: string;
  images?: string[];
  translations?: { title?: string; name?: string; locale?: string }[];
  category?: { slug?: string } | string;
  shipping_info?: {
    full_name?: string;
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    province?: string;
  };
  items?: {
    title?: string;
    name?: string;
    quantity?: number;
    price?: number;
    image?: string;
  }[];
  topic?: string;
  message?: string;
  code?: string;
  discount_type?: string;
  discount_amount?: number;
  usage_limit?: number | null;
  usage_count?: number;
  start_date?: string;
  end_date?: string;
  cover_image?: string;
  excerpt?: string;
  payment_deadline?: string;
}
export const choice = (value: string, vi: string, en: string): Choice => ({
  value,
  label: [vi, en],
});
export const ORDER_STATUS: Record<string, Text> = {
  PENDING: ["Chờ xác nhận", "Pending"],
  AWAITING_PAYMENT: ["Chờ thanh toán", "Awaiting payment"],
  PAID: ["Đã thanh toán", "Paid"],
  SHIPPED: ["Đang giao", "Shipped"],
  COMPLETED: ["Hoàn tất", "Completed"],
  CANCELED: ["Đã hủy", "Canceled"],
  EXPIRED: ["Hết hạn thanh toán", "Expired"],
  draft: ["Bản nháp", "Draft"],
  published: ["Đã xuất bản", "Published"],
  archived: ["Đã lưu trữ", "Archived"],
  new: ["Chưa đọc", "Unread"],
  read: ["Đã đọc", "Read"],
  replied: ["Đã trả lời", "Replied"],
  active: ["Đang hoạt động", "Active"],
  disabled: ["Đã tắt", "Disabled"],
  scheduled: ["Chưa đến hạn", "Scheduled"],
  expired: ["Hết hạn", "Expired"],
  exhausted: ["Hết lượt", "Exhausted"],
  banned: ["Đã khóa", "Banned"],
  pending: ["Chờ thanh toán", "Pending"],
  paid: ["Đã thanh toán", "Paid"],
  failed: ["Thất bại", "Failed"],
  refunded: ["Đã hoàn tiền", "Refunded"],
};
export const NEXT_STATUS: Record<string, string[]> = {
  PENDING: ["PAID", "CANCELED"],
  AWAITING_PAYMENT: ["PAID", "CANCELED", "EXPIRED"],
  PAID: ["SHIPPED", "CANCELED"],
  SHIPPED: ["COMPLETED"],
};
const visible: Filter = {
  key: "status",
  label: ["Hiển thị", "Visibility"],
  options: [
    choice("active", "Đang bán", "Active"),
    choice("archived", "Đã ẩn", "Hidden"),
  ],
};
const statusChoices = (values: string[]): Choice[] =>
  values.map((value) => ({ value, label: ORDER_STATUS[value] }));
export const RESOURCES: Record<
  Resource,
  {
    title: Text;
    description: Text;
    singular: Text;
    route: string;
    create?: string;
    filters: Filter[];
    columns: Text[];
    sorts: Choice[];
    search: Text;
    tabs?: Choice[];
  }
> = {
  orders: {
    title: ["Đơn hàng", "Orders"],
    description: [
      "Theo dõi thanh toán, xử lý và giao hàng.",
      "Track payments, fulfillment and delivery.",
    ],
    singular: ["đơn hàng", "orders"],
    route: "orders",
    search: [
      "Mã đơn, tên, email hoặc số điện thoại",
      "Order ID, name, email or phone",
    ],
    filters: [
      {
        key: "status",
        label: ["Trạng thái", "Status"],
        options: statusChoices([
          "PENDING",
          "AWAITING_PAYMENT",
          "PAID",
          "SHIPPED",
          "COMPLETED",
          "CANCELED",
          "EXPIRED",
        ]),
      },
      {
        key: "payment_status",
        label: ["Thanh toán", "Payment"],
        options: statusChoices(["pending", "paid", "failed", "refunded"]),
      },
    ],
    columns: [
      ["Đơn hàng", "Order"],
      ["Khách hàng", "Customer"],
      ["Trạng thái", "Status"],
      ["Thanh toán", "Payment"],
      ["Tổng tiền", "Total"],
    ],
    sorts: [
      choice("created_at:desc", "Mới nhất", "Newest"),
      choice("created_at:asc", "Cũ nhất", "Oldest"),
      choice("total:desc", "Giá trị cao nhất", "Highest value"),
    ],
    tabs: [
      choice("PAID", "Cần giao hàng", "To ship"),
      choice("AWAITING_PAYMENT", "Chờ thanh toán", "Awaiting payment"),
      choice("SHIPPED", "Đang giao", "Shipped"),
    ],
  },
  products: {
    title: ["Sản phẩm", "Products"],
    description: [
      "Quản lý danh mục hàng bán và theo dõi tồn kho.",
      "Manage your catalog and monitor inventory.",
    ],
    singular: ["sản phẩm", "products"],
    route: "products",
    create: "/admin/products/new",
    search: ["Tên sản phẩm hoặc đường dẫn", "Product name or slug"],
    filters: [
      visible,
      {
        key: "stock",
        label: ["Tồn kho", "Inventory"],
        options: [
          choice("in", "Còn hàng", "In stock"),
          choice("low", "Sắp hết · dưới 10", "Low · under 10"),
          choice("out", "Hết hàng", "Out of stock"),
        ],
      },
      { key: "category", label: ["Danh mục", "Category"], options: [] },
    ],
    columns: [
      ["Sản phẩm", "Product"],
      ["Danh mục", "Category"],
      ["Giá bán", "Price"],
      ["Tồn kho", "Inventory"],
      ["Hiển thị", "Visibility"],
    ],
    sorts: [
      choice("created_at:desc", "Mới nhất", "Newest"),
      choice("price:asc", "Giá tăng dần", "Price: low to high"),
      choice("price:desc", "Giá giảm dần", "Price: high to low"),
      choice("quantity:asc", "Tồn kho thấp nhất", "Lowest inventory"),
    ],
  },
  categories: {
    title: ["Danh mục", "Categories"],
    description: [
      "Sắp xếp sản phẩm để khách dễ tìm và khám phá.",
      "Organize products for easier discovery.",
    ],
    singular: ["danh mục", "categories"],
    route: "categories",
    create: "/admin/categories/new",
    search: ["Tên danh mục hoặc đường dẫn", "Category name or slug"],
    filters: [visible],
    columns: [
      ["Danh mục", "Category"],
      ["Đường dẫn", "Slug"],
      ["Hiển thị", "Visibility"],
      ["Ngày tạo", "Created"],
    ],
    sorts: [
      choice("created_at:desc", "Mới nhất", "Newest"),
      choice("slug:asc", "Đường dẫn A–Z", "Slug A–Z"),
    ],
  },
  users: {
    title: ["Khách hàng", "Customers"],
    description: [
      "Thông tin tài khoản, lịch sử mua và quyền truy cập.",
      "Accounts, purchase history and access.",
    ],
    singular: ["tài khoản", "accounts"],
    route: "users",
    search: ["Tên khách hàng hoặc email", "Customer name or email"],
    filters: [
      {
        key: "role",
        label: ["Vai trò", "Role"],
        options: [
          choice("CUSTOMER", "Khách hàng", "Customer"),
          choice("STAFF", "Nhân viên", "Staff"),
          choice("ADMIN", "Quản trị viên", "Admin"),
        ],
      },
      {
        key: "status",
        label: ["Tài khoản", "Account"],
        options: statusChoices(["active", "banned"]),
      },
    ],
    columns: [
      ["Khách hàng", "Customer"],
      ["Email", "Email"],
      ["Vai trò", "Role"],
      ["Tình trạng", "Status"],
      ["Tham gia", "Joined"],
    ],
    sorts: [
      choice("created_at:desc", "Mới tham gia", "Recently joined"),
      choice("full_name:asc", "Tên A–Z", "Name A–Z"),
    ],
  },
  posts: {
    title: ["Bài viết", "Journal"],
    description: [
      "Biên tập câu chuyện và kiến thức về trầm hương.",
      "Edit stories and knowledge about agarwood.",
    ],
    singular: ["bài viết", "posts"],
    route: "blog",
    create: "/admin/blog/new",
    search: ["Tiêu đề bài viết", "Post title"],
    filters: [
      {
        key: "status",
        label: ["Trạng thái", "Status"],
        options: statusChoices(["draft", "published", "archived"]),
      },
      {
        key: "category",
        label: ["Chủ đề", "Topic"],
        options: [
          choice("knowledge", "Kiến thức", "Knowledge"),
          choice("culture", "Văn hóa", "Culture"),
          choice("health", "Sức khỏe", "Health"),
        ],
      },
    ],
    columns: [
      ["Bài viết", "Post"],
      ["Chủ đề", "Topic"],
      ["Trạng thái", "Status"],
      ["Nổi bật", "Featured"],
      ["Ngày tạo", "Created"],
    ],
    sorts: [
      choice("created_at:desc", "Mới nhất", "Newest"),
      choice("title:asc", "Tiêu đề A–Z", "Title A–Z"),
    ],
    tabs: statusChoices(["draft", "published"]),
  },
  contacts: {
    title: ["Hộp thư liên hệ", "Messages"],
    description: [
      "Tiếp nhận yêu cầu và theo dõi phản hồi khách hàng.",
      "Review inquiries and track customer replies.",
    ],
    singular: ["liên hệ", "messages"],
    route: "contacts",
    search: ["Tên người gửi hoặc email", "Sender name or email"],
    filters: [
      {
        key: "status",
        label: ["Trạng thái", "Status"],
        options: statusChoices(["new", "read", "replied"]),
      },
    ],
    columns: [
      ["Người gửi", "Sender"],
      ["Chủ đề", "Topic"],
      ["Nội dung", "Message"],
      ["Trạng thái", "Status"],
      ["Ngày gửi", "Sent"],
    ],
    sorts: [
      choice("created_at:desc", "Mới nhất", "Newest"),
      choice("created_at:asc", "Cũ nhất", "Oldest"),
    ],
    tabs: statusChoices(["new", "read", "replied"]),
  },
  vouchers: {
    title: ["Mã giảm giá", "Discounts"],
    description: [
      "Theo dõi hiệu lực và lượt sử dụng của từng ưu đãi.",
      "Track discount availability and usage.",
    ],
    singular: ["mã giảm giá", "discounts"],
    route: "vouchers",
    create: "/admin/vouchers/new",
    search: ["Mã giảm giá", "Discount code"],
    filters: [
      {
        key: "status",
        label: ["Hiệu lực", "Availability"],
        options: statusChoices([
          "active",
          "scheduled",
          "expired",
          "exhausted",
          "disabled",
        ]),
      },
    ],
    columns: [
      ["Mã giảm giá", "Code"],
      ["Giá trị", "Value"],
      ["Lượt dùng", "Usage"],
      ["Thời hạn", "Valid through"],
      ["Hiệu lực", "Availability"],
    ],
    sorts: [
      choice("created_at:desc", "Mới nhất", "Newest"),
      choice("end_date:asc", "Sắp hết hạn", "Expiring soon"),
      choice("code:asc", "Mã A–Z", "Code A–Z"),
    ],
  },
};
export function voucherStatus(row: AdminRow, now = Date.now()) {
  if (!row.is_active) return "disabled";
  if (row.end_date && new Date(row.end_date).getTime() < now) return "expired";
  if (row.start_date && new Date(row.start_date).getTime() > now)
    return "scheduled";
  if (row.usage_limit != null && Number(row.usage_count) >= row.usage_limit)
    return "exhausted";
  return "active";
}
