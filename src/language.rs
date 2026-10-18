use unicode_normalization::{UnicodeNormalization, char::is_combining_mark};

pub fn latin(text: &str) -> String {
    text.nfd()
        .filter(|c| !is_combining_mark(*c))
        .map(|c| match c {
            'đ' => 'd',
            'Đ' => 'D',
            other => other,
        })
        .collect()
}

pub fn league(text: &str) -> String {
    let normalized = latin(text);
    match normalized.to_lowercase().trim() {
        "ngoai hang anh" | "giai ngoai hang anh" => "Premier League".into(),
        "giai ngoai hang tho nhi ky" => "Turkish Super Lig".into(),
        "giai bong da ngoai hang trung quoc" => "Chinese Super League".into(),
        "giai vo dich quoc gia viet nam" => "Vietnam V.League 1".into(),
        "giai bong da vo dich quoc gia ha lan" => "Dutch Eredivisie".into(),
        "giai vo dich quoc gia phap" => "Ligue 1".into(),
        "giai vo dich quoc gia duc" => "Bundesliga".into(),
        "giai vo dich quoc gia tay ban nha" => "La Liga".into(),
        "giai vo dich quoc gia y" => "Serie A".into(),
        "giao huu cau lac bo" | "giai giao huu cau lac bo" => "Club Friendlies".into(),
        _ => normalized,
    }
}

pub fn status(text: &str, football: bool) -> String {
    let normalized = latin(text);
    let key = normalized.trim().to_lowercase();
    match key.as_str() {
        "hiep 1" => if football { "First half" } else { "Period 1" }.into(),
        "hiep 2" => if football { "Second half" } else { "Period 2" }.into(),
        "hiep 3" => "Period 3".into(),
        "hiep 4" => "Period 4".into(),
        "nghi giua hiep" | "het hiep 1" => "Half time".into(),
        "hiep phu" => "Extra time".into(),
        "da ket thuc" | "ket thuc" | "het gio" => "Full time".into(),
        "chua bat dau" | "sap dien ra" => "Scheduled".into(),
        "dang dien ra" | "truc tiep" => "Live".into(),
        "hoan" | "tri hoan" => "Postponed".into(),
        "huy" | "da huy" => "Cancelled".into(),
        "gian doan" | "tam dung" => "Interrupted".into(),
        "cho xac dinh" | "chua xac dinh" => "To be confirmed".into(),
        "sut luan luu" | "luan luu" | "penalty" => "Penalties".into(),
        _ => normalized,
    }
}

pub fn commentator(text: &str) -> String {
    let name = latin(text);
    if let Some(nick) = name
        .strip_prefix("BLV ")
        .or_else(|| name.strip_prefix("blv "))
    {
        nick.trim().to_string()
    } else {
        name
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn english_labels_and_names() {
        assert_eq!(
            league("Giải bóng đá ngoại hạng Trung Quốc"),
            "Chinese Super League"
        );
        assert_eq!(league("Ngoại hạng Anh"), "Premier League");
        assert_eq!(league("Serie A"), "Serie A");
        assert_eq!(status("Hiệp 1", true), "First half");
        assert_eq!(status("Hiệp 1", false), "Period 1");
        assert_eq!(status("Đã kết thúc", true), "Full time");
        assert_eq!(status("Huỷ", true), "Cancelled");
        assert_eq!(commentator("BLV Củ Cải"), "Cu Cai");
        assert_eq!(commentator("RICKHANTER"), "RICKHANTER");
    }
}
