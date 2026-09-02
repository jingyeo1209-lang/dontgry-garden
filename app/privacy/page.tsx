import type { Metadata } from "next";
import Link from "next/link";
import {
  ADSENSE_PUBLISHER_ID,
  CONTACT_EMAIL,
  PRIVACY_OFFICER_NAME,
  PRIVACY_POLICY_EFFECTIVE_DATE,
  SITE_DISPLAY_NAME,
  SITE_LEGAL_NAME,
  SITE_URL,
} from "@/lib/site";

export const metadata: Metadata = {
  title: "개인정보처리방침 | 똔그리 가든",
  description:
    "똔그리의 돼지런(똔그리 가든) 개인정보처리방침입니다. 수집 항목, 이용 목적, 보관 기간, 쿠키·광고, 외부 서비스 이용 안내를 확인하세요.",
  openGraph: {
    title: "개인정보처리방침 | 똔그리 가든",
    description: "똔그리의 돼지런 개인정보처리방침입니다.",
    type: "website",
    images: ["/garden-map.png"],
  },
};

export default function PrivacyPage() {
  return (
    <main className="page page-narrow">
      <Link href="/" className="back-link">
        ← 대문으로 돌아가기
      </Link>
      <h1 className="page-title">개인정보처리방침</h1>
      <p className="page-desc">
        {SITE_LEGAL_NAME}({SITE_DISPLAY_NAME})는 이용자의 개인정보를 소중히 여기며, 관련 법령을
        준수합니다.
      </p>

      <article className="privacy-body">
        <div className="privacy-meta">
          <p>
            <strong>시행일:</strong> {PRIVACY_POLICY_EFFECTIVE_DATE}
          </p>
          <p>
            <strong>최종 개정일:</strong> {PRIVACY_POLICY_EFFECTIVE_DATE}
          </p>
        </div>

        <h2>1. 개요</h2>
        <p>
          본 개인정보처리방침은 {SITE_URL} 및 이에 연결된 {SITE_DISPLAY_NAME} 서비스(이하
          &quot;사이트&quot;)에서 개인정보가 어떻게 처리되는지 설명합니다.
        </p>
        <p>
          사이트는 회원가입, 로그인, 결제, 댓글·문의 양식 등 이용자가 직접 개인정보를 입력·제출하는
          기능을 운영하지 않습니다. 다만 광고 게재, 호스팅, 콘텐츠 제공 과정에서 자동으로 생성·수집될
          수 있는 정보와, 이용자가 이메일로 문의할 때 제공하는 정보가 있을 수 있습니다.
        </p>

        <h2>2. 개인정보의 처리 목적</h2>
        <p>사이트는 다음 목적을 위해 개인정보를 처리합니다.</p>
        <ul>
          <li>사이트 운영, 콘텐츠 제공, 오류 대응 및 보안</li>
          <li>이용 문의에 대한 회신</li>
          <li>Google AdSense를 통한 광고 게재</li>
          <li>관련 법령에 따른 의무 이행</li>
        </ul>

        <h2>3. 수집하는 개인정보 항목</h2>
        <p>
          <strong>가. 이용자가 직접 제공하는 정보</strong>
        </p>
        <ul>
          <li>
            <strong>문의 이메일:</strong> 하단 &quot;문의하기&quot;를 통해 이메일을 보내는 경우,
            이용자가 메일에 기재한 이메일 주소·이름·문의 내용 등
          </li>
        </ul>
        <p>
          <strong>나. 서비스 이용 과정에서 자동으로 생성·수집될 수 있는 정보</strong>
        </p>
        <ul>
          <li>
            <strong>서버 접속 기록:</strong> IP 주소, 접속 일시, 요청 URL, 브라우저·기기 정보,
            참조 경로 등(호스팅 서비스 운영 과정에서 생성될 수 있음)
          </li>
          <li>
            <strong>광고 관련 정보:</strong> Google AdSense가 광고 제공·측정을 위해 쿠키 등을 통해
            수집할 수 있는 정보
          </li>
        </ul>
        <p>
          <strong>다. 사이트가 서버로 수집하지 않는 정보</strong>
        </p>
        <ul>
          <li>
            투자자의 오아시스(<code>/oasis.html</code>)의 시드머니·운세 기록, 썬그리의 메타
            안경(<code>/magic-glasses.html</code>)의 입력·계산 기록 등은 이용자의 브라우저{" "}
            <code>localStorage</code>에만 저장되며, 사이트 서버로 전송되지 않습니다.
          </li>
        </ul>

        <h2>4. 개인정보의 수집 방법</h2>
        <ul>
          <li>이용자가 이메일로 문의하는 경우: 이용자가 직접 발송한 메일</li>
          <li>사이트 방문 시: 웹 서버·호스팅 환경에서 자동 생성되는 접속 기록</li>
          <li>광고 영역 이용 시: Google AdSense 스크립트를 통한 자동 수집(해당 시)</li>
        </ul>

        <h2>5. 개인정보의 보유 및 이용 기간</h2>
        <ul>
          <li>
            <strong>문의 이메일:</strong> 이용자가 이메일을 통해 문의한 경우 문의 내용은 문의에 대한
            답변 및 처리를 위해 이용되며, 문의 목적이 달성된 후 지체 없이 삭제합니다. 다만 관련
            법령 또는 이메일 서비스 제공자의 정책에 따라 별도의 보관이 필요한 경우에는 해당
            기준을 따를 수 있습니다.
          </li>
          <li>
            <strong>서버 접속 기록:</strong> 호스팅 서비스의 정책 및 운영 필요에 따라 보관되며, 일반적으로
            수개월 이내 순환·삭제될 수 있음
          </li>
          <li>
            <strong>광고·쿠키 관련 정보:</strong> Google 정책 및 이용자의 브라우저 설정에 따름
          </li>
          <li>
            <strong>브라우저 localStorage:</strong> 이용자가 브라우저 데이터를 삭제하거나 사이트
            데이터를 초기화할 때까지 해당 기기에 남을 수 있음
          </li>
        </ul>

        <h2>6. 개인정보의 제3자 제공</h2>
        <p>
          사이트는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 다만 아래의 경우는
          예외입니다.
        </p>
        <ul>
          <li>이용자가 사전에 동의한 경우</li>
          <li>법령에 근거하거나 수사·조사 기관의 적법한 요청이 있는 경우</li>
        </ul>
        <p>
          Google AdSense는 광고 제공 과정에서 Google이 별도로 정보를 처리할 수 있으며, 이는 Google의
          개인정보처리방침에 따릅니다.
        </p>

        <h2>7. 개인정보 처리의 위탁 및 외부 서비스 이용</h2>
        <p>사이트 운영을 위해 다음 외부 서비스를 이용합니다.</p>
        <ul>
          <li>
            <strong>Vercel(호스팅):</strong> 사이트 배포·운영. 접속 기록 등이 처리될 수 있습니다.{" "}
            <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">
              Vercel 개인정보처리방침
            </a>
          </li>
          <li>
            <strong>Notion(콘텐츠 관리):</strong> 글·이미지 등 콘텐츠를 서버에서 불러와 표시합니다.
            이용자가 사이트를 방문한다는 사실만으로 Notion에 개인정보가 전달되지는 않으며, 서버
            측 API 연동에 사용되는 인증 정보는 이용자에게 공개되지 않습니다.{" "}
            <a href="https://www.notion.so/privacy" target="_blank" rel="noopener noreferrer">
              Notion 개인정보처리방침
            </a>
          </li>
          <li>
            <strong>Google AdSense(광고):</strong> 광고 게재. 게시자 ID: {ADSENSE_PUBLISHER_ID}.{" "}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google 개인정보처리방침
            </a>
            ,{" "}
            <a
              href="https://policies.google.com/technologies/ads"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google 광고 정책
            </a>
          </li>
        </ul>
        <p>
          글에 포함된 이미지는 Notion·AWS S3·Unsplash 등 허용된 출처에서 서버를 통해 불러와
          표시될 수 있습니다. 레거시 커버 이미지의 경우 Oopy(lazyrockets.com) URL이 사용될 수
          있습니다.
        </p>
        <p>
          <strong>일부 정적 페이지의 브라우저 직접 연동</strong>
        </p>
        <p>
          썬그리의 메타 안경 페이지는 이용자의 브라우저에서 시세·지표 조회를 위해 외부 공개 API(예:
          Yahoo Finance, Alternative.me 등) 및 CORS 프록시 서비스에 직접 요청을 보낼 수 있습니다.
          이 경우 이용자의 IP 주소 등이 해당 외부 서비스에 전달될 수 있으며, 사이트 서버를 거치지
          않습니다.
        </p>

        <h2>8. 쿠키 및 로컬 저장소</h2>
        <p>
          <strong>가. 쿠키</strong>
        </p>
        <p>
          사이트 자체적으로 로그인·맞춤 설정 등을 위한 쿠키를 별도로 설정하는 기능은 확인되지
          않습니다. 다만 Google AdSense가 광고 제공·측정을 위해 쿠키를 사용할 수 있습니다.
        </p>
        <p>
          이용자는 브라우저 설정에서 쿠키 저장을 거부하거나 삭제할 수 있습니다. 쿠키를 거부하면
          광고 표시 방식에 영향을 줄 수 있습니다.
        </p>
        <p>
          <strong>나. localStorage</strong>
        </p>
        <p>
          투자자의 오아시스, 썬그리의 메타 안경 등 일부 페이지는 게임·계산 진행을 위해 브라우저{" "}
          <code>localStorage</code>를 사용합니다. 이 정보는 이용자의 기기에만 저장되며 서버로
          전송되지 않습니다.
        </p>

        <h2>9. Google Analytics 등 분석 도구</h2>
        <p>
          현재 사이트 코드에는 Google Analytics, Google Tag Manager 등 별도의 방문 통계·행동 분석
          도구가 연동되어 있지 않습니다. 광고 관련 처리는 Google AdSense에 한정됩니다.
        </p>

        <h2>10. 외부 링크</h2>
        <p>
          사이트의 글, 배너, 하단 링크 등을 통해 외부 웹사이트로 이동할 수 있습니다. 외부 사이트의
          개인정보 처리는 해당 사이트의 정책을 따르며, 본 방침이 적용되지 않습니다.
        </p>

        <h2>11. 이용자의 권리</h2>
        <p>
          이용자는 개인정보 보호법 등 관련 법령에 따라 개인정보 열람, 정정·삭제, 처리 정지 등을
          요청할 수 있습니다. 문의 이메일로 보낸 내용의 삭제를 원하시면 아래 연락처로 요청해
          주세요.
        </p>

        <h2>12. 개인정보의 안전성 확보 조치</h2>
        <p>사이트는 개인정보 보호를 위해 다음과 같은 조치를 취합니다.</p>
        <ul>
          <li>Notion API 토큰 등 민감한 설정값을 서버 환경 변수로 관리</li>
          <li>이미지 프록시에서 허용된 도메인만 요청하도록 제한</li>
          <li>호스팅·배포 환경의 접근 통제 활용</li>
        </ul>

        <h2>13. 개인정보 보호책임자 및 문의</h2>
        <p>개인정보 처리에 관한 문의·불만·피해 구제 요청은 아래로 연락해 주세요.</p>
        <ul>
          <li>
            <strong>개인정보 보호책임자:</strong> {PRIVACY_OFFICER_NAME}
          </li>
          <li>
            <strong>이메일:</strong>{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </li>
          <li>
            <strong>사이트:</strong> {SITE_URL}
          </li>
        </ul>

        <h2>14. 개인정보처리방침의 변경</h2>
        <p>
          본 방침이 변경되는 경우 사이트에 공지하거나 본 페이지를 개정하여 안내합니다. 변경 내용은
          시행일로부터 적용됩니다.
        </p>
      </article>
    </main>
  );
}
