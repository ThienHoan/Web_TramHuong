import Image from "next/image";

export const REFERENCES = [
  {
    id: "bracelet",
    title: "Vòng hạt tròn VT8TC",
    image: "/references/annhien/bracelet-detail.jpg",
    url: "https://tramhuongannhien.vn/vong-tay-tram-huong-8mm-hat-tron-trung-cap-vt8tc/",
    note: "21 hạt · sắc nâu mộc · vân gỗ thô, ít bóng",
  },
  {
    id: "burner",
    title: "Lư gốm GOM1",
    image: "/references/annhien/burner.jpg",
    url: "https://tramhuongannhien.vn/dot-tram-bang-gom-lu-tron-gom1/",
    note: "Thân thấp, bè · ba chân · men xanh xám · nắp thoát hương",
  },
  {
    id: "cones",
    title: "Nụ trầm NPT",
    image: "/references/annhien/cones.jpg",
    url: "https://tramhuongannhien.vn/tram-nu-pho-thong-npt/",
    note: "Dáng nụ thuôn, đầu nhỏ · bề mặt bột nén, nâu mộc",
  },
];

export default function ReferencePanel() {
  return (
    <section className="lab-references" aria-labelledby="reference-heading">
      <div>
        <p className="lab-eyebrow">ĐỐI CHIẾU HÌNH DÁNG & CHẤT LIỆU</p>
        <h2 id="reference-heading">Từ ảnh thật đến không gian 3D.</h2>
        <p>
          Ảnh tham chiếu từ Trầm Hương An Nhiên. Bản dựng tái hiện hình dáng và
          chất liệu theo ảnh, chưa phải mô hình quét 3D của sản phẩm.
        </p>
      </div>
      <div className="lab-reference-grid">
        {REFERENCES.map((reference) => (
          <a
            href={reference.url}
            key={reference.id}
            target="_blank"
            rel="noreferrer"
            className="lab-reference-card"
          >
            <div>
              <Image
                src={reference.image}
                alt={`Ảnh gốc ${reference.title} của Trầm Hương An Nhiên`}
                fill
                sizes="(max-width: 760px) 90vw, 30vw"
              />
            </div>
            <h3>{reference.title}</h3>
            <p>{reference.note}</p>
            <span>Nguồn: An Nhiên ↗</span>
          </a>
        ))}
      </div>
    </section>
  );
}
