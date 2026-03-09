/**
 * Utility for generating Static PIX (BRCode)
 */

export function crc16(data: string): string {
    let crc = 0xFFFF;
    for (let i = 0; i < data.length; i++) {
        crc ^= data.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) !== 0) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc <<= 1;
            }
        }
    }
    return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, "0");
}

export function generatePixPayload(key: string, amount: number, name: string, city: string, description: string = ""): string {
    const f = (id: string, val: string) => `${id}${val.length.toString().padStart(2, "0")}${val}`;

    const gui = "br.gov.bcb.pix";
    const merchantAccount = f("00", gui) + f("01", key);

    let payload =
        f("00", "01") + // Payload Format Indicator
        f("26", merchantAccount) + // Merchant Account Information
        f("52", "0000") + // Merchant Category Code
        f("53", "986") + // Transaction Currency (BRL)
        f("54", amount.toFixed(2)) + // Transaction Amount
        f("58", "BR") + // Country Code
        f("59", name.substring(0, 25)) + // Merchant Name
        f("60", city.substring(0, 15)) + // Merchant City
        f("62", f("05", description.substring(0, 25) || "TRATOPEL-PEDIDO")); // Additional Data Field (Reference)

    payload += "6304"; // CRC16 Indicator
    return payload + crc16(payload);
}
