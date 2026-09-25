import { getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import { InfoNotice } from "@/components/ui/info-notice";
import { MapPinIcon } from "@/components/ui/icons";

export async function HomeLocationNotice() {
  const t = await getTranslations("Home.locationNotice");

  return (
    <Container>
      <InfoNotice
        description={t("description")}
        icon={<MapPinIcon size={20} />}
        title={t("title")}
      />
    </Container>
  );
}
