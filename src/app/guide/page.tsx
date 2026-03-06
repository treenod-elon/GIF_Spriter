import Link from 'next/link';
import {
  ArrowLeft,
  Upload,
  Link2,
  Sparkles,
  Search,
  Download,
  FileImage,
  Tag,
  Grid3x3,
  MonitorPlay,
} from 'lucide-react';

export default function GuidePage() {
  return (
    <div className="min-h-screen px-4 py-12 md:px-8">
      <div className="mx-auto max-w-[860px]">
        {/* Back button */}
        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-2 rounded-lg border border-accent-primary/30 px-4 py-2 text-sm font-semibold text-accent-primary transition-all hover:bg-accent-primary/10 hover:border-accent-primary/50"
        >
          <ArrowLeft className="h-4 w-4" />
          GIF Spriter로 돌아가기
        </Link>

        {/* Title */}
        <h1 className="font-display text-4xl font-bold leading-tight text-text-primary md:text-5xl">
          <span className="text-gradient">GIF Spriter</span> 이용 안내
        </h1>
        <p className="mt-4 text-base text-text-secondary">
          VFX 스프라이트 리소스 라이브러리의 주요 기능과 사용 방법을 안내합니다.
        </p>

        {/* Sections */}
        <div className="mt-12 space-y-6">
          {/* 1. 서비스 소개 */}
          <section className="glass-card rounded-2xl p-6 md:p-8">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary/15">
                <Sparkles className="h-5 w-5 text-accent-primary" />
              </div>
              <h2 className="font-display text-xl font-bold text-text-primary">
                서비스 소개
              </h2>
            </div>
            <p className="leading-relaxed text-text-secondary">
              GIF Spriter는 모바일 게임 개발자를 위한 무료 VFX 스프라이트 리소스 라이브러리입니다.
              GIF 애니메이션을 업로드하면 자동으로 프레임을 분석하고, 게임에서 바로 사용할 수 있는
              스프라이트 시트로 변환해 줍니다. 로그인 없이 누구나 자유롭게 이용할 수 있습니다.
            </p>
          </section>

          {/* 2. 업로드 방법 */}
          <section className="glass-card rounded-2xl p-6 md:p-8">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary/15">
                <Upload className="h-5 w-5 text-accent-primary" />
              </div>
              <h2 className="font-display text-xl font-bold text-text-primary">
                업로드 방법
              </h2>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="mb-1 flex items-center gap-2 font-semibold text-text-primary">
                  <FileImage className="h-4 w-4 text-accent-primary" />
                  로컬 파일 업로드
                </h3>
                <p className="pl-6 leading-relaxed text-text-secondary">
                  메인 페이지의 업로드 영역에 GIF 파일을 드래그 앤 드롭하거나 클릭하여 파일을 선택합니다.
                  여러 파일을 한 번에 드롭하면 일괄 업로드됩니다.
                </p>
              </div>
              <div>
                <h3 className="mb-1 flex items-center gap-2 font-semibold text-text-primary">
                  <Link2 className="h-4 w-4 text-accent-primary" />
                  URL 임포트
                </h3>
                <p className="pl-6 leading-relaxed text-text-secondary">
                  헤더의 &quot;URL Import&quot; 버튼을 클릭하여 외부 URL에서 직접 GIF 리소스를 가져올 수 있습니다.
                  URL을 입력하면 AI가 이미지를 분석하고 자동으로 처리합니다.
                </p>
              </div>
            </div>
          </section>

          {/* 3. 스프라이트 시트 변환 */}
          <section className="glass-card rounded-2xl p-6 md:p-8">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary/15">
                <Grid3x3 className="h-5 w-5 text-accent-primary" />
              </div>
              <h2 className="font-display text-xl font-bold text-text-primary">
                스프라이트 시트 변환 &amp; 다운로드
              </h2>
            </div>
            <p className="mb-3 leading-relaxed text-text-secondary">
              업로드된 GIF는 자동으로 각 프레임으로 분리되어 하나의 스프라이트 시트(PNG)로 합쳐집니다.
              프레임 간 간격 없이 깔끔하게 정렬되며, 원본 GIF의 해상도를 그대로 유지합니다.
            </p>
            <div className="flex items-start gap-2">
              <Download className="mt-0.5 h-4 w-4 shrink-0 text-accent-primary" />
              <p className="leading-relaxed text-text-secondary">
                카드의 다운로드 버튼을 클릭하면 스프라이트 시트(PNG), 개별 프레임, 원본 GIF 등
                원하는 형식을 선택하여 다운로드할 수 있습니다.
              </p>
            </div>
          </section>

          {/* 4. AI 태깅 & 검색 */}
          <section className="glass-card rounded-2xl p-6 md:p-8">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary/15">
                <Tag className="h-5 w-5 text-accent-primary" />
              </div>
              <h2 className="font-display text-xl font-bold text-text-primary">
                AI 자동 태깅 &amp; 검색
              </h2>
            </div>
            <p className="mb-3 leading-relaxed text-text-secondary">
              업로드 시 AI(Gemini)가 이미지를 분석하여 자동으로 해시태그를 부여합니다.
              Fire, Smoke, Electric, Magic 등 VFX 특성에 맞는 태그가 자동 분류됩니다.
              모든 리소스에는 최소 1개 이상의 태그가 보장됩니다.
            </p>
            <div className="flex items-start gap-2">
              <Search className="mt-0.5 h-4 w-4 shrink-0 text-accent-primary" />
              <p className="leading-relaxed text-text-secondary">
                갤러리 상단의 검색바와 태그 필터를 활용하여 원하는 리소스를 빠르게 찾을 수 있습니다.
                이름, 태그, 카테고리로 검색이 가능합니다.
              </p>
            </div>
          </section>

          {/* 5. 지원 포맷 */}
          <section className="glass-card rounded-2xl p-6 md:p-8">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary/15">
                <MonitorPlay className="h-5 w-5 text-accent-primary" />
              </div>
              <h2 className="font-display text-xl font-bold text-text-primary">
                지원 포맷
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { format: 'GIF', desc: '애니메이션 GIF 업로드' },
                { format: 'PNG', desc: '스프라이트 시트 / 개별 프레임' },
                { format: 'WebP', desc: '고효율 이미지 다운로드' },
              ].map(({ format, desc }) => (
                <div
                  key={format}
                  className="rounded-xl border border-[var(--glass-border)] px-4 py-3 text-center"
                  style={{ background: 'var(--glass-bg)' }}
                >
                  <p className="font-display text-lg font-bold text-accent-primary">{format}</p>
                  <p className="mt-1 text-xs text-text-tertiary">{desc}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Bottom back button */}
        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-accent-primary px-6 py-3 text-sm font-semibold text-text-inverse transition-all hover:bg-accent-primary-hover hover:shadow-glow"
          >
            <ArrowLeft className="h-4 w-4" />
            GIF Spriter로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
