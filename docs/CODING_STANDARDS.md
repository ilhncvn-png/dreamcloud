# CODING_STANDARDS.md

## DreamCloud — Kodlama Standartları

**Versiyon:** 1.0 | **Tarih:** 2026-06-14  
**Kaynak:** MASTER_PROJECT.md · TECH_STACK.md · SYSTEM_ARCHITECTURE.md

> Stil tartışması yapmak yerine bu belge referans alınır.
> ESLint + Prettier otomatik uygular; elle düzeltme beklenmez.

---

## 1. TYPESCRIPT GENEL KURALLAR

### 1.1 Tip Güvenliği

```typescript
// ✅ Strict mode zorunlu (tsconfig.json'da)
// "strict": true  → null check, implicit any yasak, vs.

// ✅ Her değişkenin tipi belirli
const userId: string = user.id;
const count: number = dreams.length;

// ❌ any yasak
const data: any = response;              // any kullanma
function process(input: any) { ... }    // any kullanma

// ✅ unknown kullan, narrowing yap
function process(input: unknown) {
  if (typeof input === 'string') {
    return input.toUpperCase();
  }
}

// ✅ Type assertion yalnızca zorunluysa ve doğrulanmışsa
const dream = data as Dream;  // Sadece runtime'da Dream olduğundan eminsek

// ✅ Non-null assertion yalnızca null olmayacağı kanıtlandıysa
const name = user.profile!.username;  // Profile'ın var olduğunu biliyoruz
```

### 1.2 Interface vs Type

```typescript
// ✅ Nesne yapıları için interface (extend edilebilir)
interface Dream {
  id: string;
  content: string;
  category: DreamCategory;
  createdAt: Date;
}

interface PublicDream extends Dream {
  author: UserProfile;
  likeCount: number;
}

// ✅ Union, intersection ve utility tipler için type
type DreamCategory = 'lucid' | 'beautiful' | 'nightmare' | 'normal';
type DreamVisibility = 'private' | 'followers' | 'public';
type CreateDreamInput = Omit<Dream, 'id' | 'createdAt'>;
type PartialDream = Partial<Pick<Dream, 'content' | 'category'>>;
```

### 1.3 Enum

```typescript
// ✅ String enum kullan (debuggable, veritabanıyla uyumlu)
enum DreamCategory {
  LUCID = 'lucid',
  BEAUTIFUL = 'beautiful',
  NIGHTMARE = 'nightmare',
  NORMAL = 'normal',
}

// ❌ Numeric enum kullanma (okunaksız, DB değerleriyle uyumsuz)
enum DreamCategory {
  LUCID, // 0
  BEAUTIFUL, // 1
}
```

### 1.4 Async/Await

```typescript
// ✅ async/await kullan
async function getDream(id: string): Promise<Dream> {
  const dream = await this.dreamsRepository.findOneBy({ id });
  if (!dream) throw new NotFoundException('DREAM_NOT_FOUND');
  return dream;
}

// ❌ Promise chain kullanma
function getDream(id: string): Promise<Dream> {
  return this.dreamsRepository.findOneBy({ id }).then((dream) => {
    if (!dream) throw new NotFoundException();
    return dream;
  });
}

// ✅ Paralel async işlemler için Promise.all
const [dream, author, tags] = await Promise.all([
  this.dreamsRepository.findOneBy({ id }),
  this.usersRepository.findOneBy({ id: authorId }),
  this.tagsRepository.findBy({ dreamId: id }),
]);
```

---

## 2. NESTJS STANDARTLARI

### 2.1 Module Yapısı

```typescript
// ✅ Her modül kendi bağımlılıklarını export eder
@Module({
  imports: [
    TypeOrmModule.forFeature([Dream, Tag, DreamTag]),
    BullModule.registerQueue({ name: 'nlp' }),
  ],
  controllers: [DreamsController],
  providers: [DreamsService, DreamsRepository],
  exports: [DreamsService], // Başka modüller kullanacaksa export et
})
export class DreamsModule {}
```

### 2.2 Controller Kuralları

```typescript
@ApiTags('dreams') // Swagger grup
@ApiBearerAuth() // Auth gerektiren endpoint'ler
@Controller('v1/dreams')
export class DreamsController {
  constructor(private readonly dreamsService: DreamsService) {}

  // ✅ HTTP method açık, route temiz
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new dream' })
  @ApiResponse({ status: 201, type: DreamResponseDto })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateDreamDto,
  ): Promise<DreamResponseDto> {
    return this.dreamsService.create(user.sub, dto);
  }

  // ✅ Pagination için query DTO
  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: DreamQueryDto,
  ): Promise<PaginatedResponse<DreamResponseDto>> {
    return this.dreamsService.findAll(user.sub, query);
  }

  // ✅ Path param için ParseUUIDPipe
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<DreamResponseDto> {
    return this.dreamsService.findOne(id, user.sub);
  }
}
```

### 2.3 Service Kuralları

```typescript
@Injectable()
export class DreamsService {
  private readonly logger = new Logger(DreamsService.name);

  constructor(
    @InjectRepository(Dream)
    private readonly dreamsRepository: Repository<Dream>,
    @InjectQueue('nlp')
    private readonly nlpQueue: Queue,
  ) {}

  async create(userId: string, dto: CreateDreamDto): Promise<Dream> {
    // 1. İş mantığı validasyonu
    // 2. Entity oluştur
    // 3. Kaydet
    // 4. Async işlemi tetikle (NLP embedding)
    // 5. Dön

    this.logger.log('Creating dream', { userId });

    const dream = this.dreamsRepository.create({
      ...dto,
      userId,
    });

    const saved = await this.dreamsRepository.save(dream);

    // Async NLP job — kullanıcıyı bekletme
    await this.nlpQueue.add(
      'embed',
      { dreamId: saved.id },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
    );

    this.logger.log('Dream created, NLP job queued', { dreamId: saved.id });
    return saved;
  }
}
```

### 2.4 DTO Kuralları

```typescript
import { IsString, IsEnum, IsArray, MaxLength, MinLength, IsOptional } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDreamDto {
  @ApiProperty({ description: 'Dream content', maxLength: 2000 })
  @IsString()
  @MinLength(10, { message: 'Dream content must be at least 10 characters' })
  @MaxLength(2000, { message: 'Dream content cannot exceed 2000 characters' })
  @Transform(({ value }) => value?.trim()) // Boşluk temizle
  content: string;

  @ApiPropertyOptional({ description: 'Dream title', maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  @Transform(({ value }) => value?.trim())
  title?: string;

  @ApiProperty({ enum: DreamCategory })
  @IsEnum(DreamCategory, { message: 'Invalid dream category' })
  category: DreamCategory;

  @ApiProperty({ enum: DreamVisibility })
  @IsEnum(DreamVisibility)
  visibility: DreamVisibility;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];
}
```

### 2.5 Entity Kuralları

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('dreams')
@Index(['userId', 'createdAt']) // Sık kullanılan sorgu için
@Index(['visibility', 'deletedAt']) // Feed sorgusu için
export class Dream {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ nullable: true, length: 150 })
  title: string | null;

  @Column({ type: 'enum', enum: DreamCategory, default: DreamCategory.NORMAL })
  category: DreamCategory;

  @Column({ type: 'enum', enum: DreamVisibility, default: DreamVisibility.PRIVATE })
  visibility: DreamVisibility;

  @Column({ type: 'int', default: 0 })
  likeCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn() // Soft delete
  deletedAt: Date | null;

  // İlişkiler
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;
}
```

---

## 3. REACT NATIVE / EXPO STANDARTLARI

### 3.1 Komponent Kuralları

```typescript
// ✅ Fonksiyonel komponent + TypeScript props interface
interface DreamCardProps {
  dream: Dream;
  onPress?: () => void;
  onLike?: (dreamId: string) => void;
  showAuthor?: boolean;
}

export const DreamCard: React.FC<DreamCardProps> = ({
  dream,
  onPress,
  onLike,
  showAuthor = true,
}) => {
  // Hooks en üstte
  const { colors } = useTheme();
  const [liked, setLiked] = useState(false);

  // Event handlers
  const handleLike = useCallback(() => {
    setLiked(prev => !prev);
    onLike?.(dream.id);
  }, [dream.id, onLike]);

  // Render
  return (
    <Pressable onPress={onPress} style={styles.container}>
      <Text style={[styles.content, { color: colors.text }]}>
        {dream.content}
      </Text>
    </Pressable>
  );
};

// ✅ StyleSheet.create ile (inline style değil)
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0A0A1A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
  },
});
```

### 3.2 Hooks Kuralları

```typescript
// ✅ Custom hook her zaman 'use' ile başlar
export function useDreams(options?: UseInfiniteQueryOptions) {
  return useInfiniteQuery({
    queryKey: ['dreams', options],
    queryFn: ({ pageParam }) => dreamsApi.getAll({ cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.pagination.cursor,
  });
}

// ✅ Zustand store — minimal state, action'lar store içinde
interface AuthStore {
  user: User | null;
  accessToken: string | null;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  accessToken: null,
  setUser: (user) => set({ user }),
  setToken: (token) => set({ accessToken: token }),
  logout: () => set({ user: null, accessToken: null }),
}));
```

### 3.3 API Client Kuralları

```typescript
// ✅ Axios instance — token interceptor dahil
const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — token ekle
apiClient.interceptors.request.use(async (config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — 401'de refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token yenile, isteği tekrar dene
      const newToken = await refreshAccessToken();
      error.config!.headers!.Authorization = `Bearer ${newToken}`;
      return apiClient(error.config!);
    }
    return Promise.reject(error);
  },
);
```

### 3.4 Güvenli Depolama

```typescript
// ✅ SecureStore kullan — AsyncStorage değil (token için)
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'dreamcloud_refresh_token';

export const tokenStorage = {
  save: (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token),
  get: () => SecureStore.getItemAsync(TOKEN_KEY),
  delete: () => SecureStore.deleteItemAsync(TOKEN_KEY),
};

// ❌ AsyncStorage token için kullanma (şifresiz)
await AsyncStorage.setItem('token', refreshToken);
```

---

## 4. PYTHON / FASTAPI STANDARTLARI

### 4.1 Tip Anotasyonu

```python
# ✅ Her fonksiyon tam tip anotasyonlu
from __future__ import annotations
from typing import Optional

async def generate_embedding(text: str) -> list[float]:
    """Generate sentence embedding for dream content."""
    ...

async def find_similar_dreams(
    embedding: list[float],
    limit: int = 10,
    threshold: float = 0.7,
) -> list[DreamMatch]:
    ...

# ✅ Pydantic model ile request/response
class EmbedRequest(BaseModel):
    dream_id: str
    content: str
    max_length: int = Field(default=512, ge=1, le=1024)

class EmbedResponse(BaseModel):
    dream_id: str
    embedding: list[float]
    model_name: str
    processing_time_ms: float
```

### 4.2 FastAPI Route Yapısı

```python
from fastapi import APIRouter, Depends, HTTPException, status
from app.services.embedding_service import EmbeddingService
from app.models.request_models import EmbedRequest
from app.models.response_models import EmbedResponse

router = APIRouter(prefix="/internal", tags=["internal"])

@router.post(
    "/embed",
    response_model=EmbedResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate embedding for dream content",
)
async def create_embedding(
    request: EmbedRequest,
    service: EmbeddingService = Depends(),
) -> EmbedResponse:
    try:
        return await service.generate(request)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
```

### 4.3 Hata Yönetimi

```python
# ✅ Custom exception class'ları
class EmbeddingError(Exception):
    """Raised when embedding generation fails."""
    pass

class ModelNotLoadedError(EmbeddingError):
    """Raised when sentence transformer model is not loaded."""
    pass

# ✅ Exception handler
@app.exception_handler(EmbeddingError)
async def embedding_error_handler(request: Request, exc: EmbeddingError):
    logger.error("Embedding failed", error=str(exc), path=request.url.path)
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"error": "EMBEDDING_SERVICE_UNAVAILABLE", "detail": str(exc)},
    )
```

### 4.4 Bağımlılık Yönetimi

```python
# pyproject.toml — sabit versiyonlar
[tool.poetry.dependencies]
python = "^3.11"
fastapi = "^0.110.0"
uvicorn = "^0.27.0"
sentence-transformers = "^2.6.0"
asyncpg = "^0.29.0"
pgvector = "^0.2.5"
pydantic-settings = "^2.2.0"
celery = "^5.3.6"

[tool.poetry.group.dev.dependencies]
pytest = "^8.1.0"
pytest-asyncio = "^0.23.0"
httpx = "^0.27.0"  # FastAPI test client
ruff = "^0.3.0"
mypy = "^1.9.0"
```

---

## 5. ORTAK STANDARTLAR

### 5.1 Isimlendirme

| Kavram           | TypeScript                     | Python             |
| ---------------- | ------------------------------ | ------------------ |
| Sınıf            | `PascalCase`                   | `PascalCase`       |
| Fonksiyon/Method | `camelCase`                    | `snake_case`       |
| Değişken         | `camelCase`                    | `snake_case`       |
| Sabit            | `UPPER_SNAKE_CASE`             | `UPPER_SNAKE_CASE` |
| Private field    | `_camelCase` veya `#camelCase` | `_snake_case`      |
| DB tablo/kolon   | —                              | `snake_case`       |
| Enum üye         | `UPPER_SNAKE_CASE`             | `UPPER_SNAKE_CASE` |
| Interface/Type   | `PascalCase`                   | — (Pydantic class) |
| Dosya            | `kebab-case.ts`                | `snake_case.py`    |

### 5.2 Magic Number ve String

```typescript
// ❌ Magic number
if (password.length < 8) { ... }
if (attempts >= 5) { ... }
await sleep(300);

// ✅ Named constant
const MIN_PASSWORD_LENGTH = 8;
const MAX_LOGIN_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 300_000;  // Sayı ayırıcı kullan

if (password.length < MIN_PASSWORD_LENGTH) { ... }
if (attempts >= MAX_LOGIN_ATTEMPTS) { ... }
```

### 5.3 Yorum Kuralları

```typescript
// ✅ Yalnızca NEDEN açıklanır (NE değil — kod zaten söylüyor)

// bcrypt rounds=12: ~300ms deliberate slowness to prevent brute force.
// Increasing above 12 risks timeout on auth endpoints under load.
const BCRYPT_ROUNDS = 12;

// Refresh token stored as SHA-256 hash, not plaintext.
// If DB is compromised, tokens cannot be replayed without the originals.
const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

// ❌ NE açıklamak — kodu tekrarlamak
// Kullanıcıyı bul
const user = await this.usersRepository.findOneBy({ email });

// ❌ Tarihe bağlı yorum
// 2026-06-14: Bu geçici fix, v1.1'de kaldırılacak
```

### 5.4 Import Sıralaması (ESLint otomatik)

```typescript
// 1. Node.js built-in
import { createHash } from 'crypto';

// 2. NestJS ve 3. taraf kütüphaneler
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// 3. İç modüller (proje içi)
import { Dream } from '../entities/dream.entity';
import { CreateDreamDto } from '../dto/create-dream.dto';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
```

---

## 6. ARAÇ YAPILANDIRMASI

### ESLint (.eslintrc.js — dreamcloud-api)

```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: { project: 'tsconfig.json', sourceType: 'module' },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: ['plugin:@typescript-eslint/recommended', 'plugin:prettier/recommended'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error', // any yasak
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'warn',
    'no-console': 'error', // console.log yasak
    'no-debugger': 'error',
  },
};
```

### Prettier (.prettierrc)

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### TypeScript (tsconfig.json — kritik ayarlar)

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### Ruff (pyproject.toml — NLP servisi)

```toml
[tool.ruff]
line-length = 100
target-version = "py311"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "UP", "S", "B", "A", "COM", "C4", "DTZ", "T20"]
ignore = ["S101"]  # assert pytest testlerinde kabul edilir

[tool.mypy]
python_version = "3.11"
strict = true
ignore_missing_imports = false
```

---

## 7. TEST STANDARTLARI

### Unit Test (NestJS / Jest)

```typescript
describe('DreamsService', () => {
  let service: DreamsService;
  let repository: jest.Mocked<Repository<Dream>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DreamsService,
        {
          provide: getRepositoryToken(Dream),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOneBy: jest.fn(),
            findAndCount: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DreamsService>(DreamsService);
    repository = module.get(getRepositoryToken(Dream));
  });

  describe('create', () => {
    it('should create dream and queue NLP job', async () => {
      // Arrange
      const dto: CreateDreamDto = {
        content: 'I was flying over the ocean...',
        category: DreamCategory.BEAUTIFUL,
        visibility: DreamVisibility.PUBLIC,
      };
      const userId = 'user-uuid';
      const expectedDream = { id: 'dream-uuid', ...dto, userId };

      repository.create.mockReturnValue(expectedDream as Dream);
      repository.save.mockResolvedValue(expectedDream as Dream);

      // Act
      const result = await service.create(userId, dto);

      // Assert
      expect(result).toEqual(expectedDream);
      expect(repository.save).toHaveBeenCalledWith(expectedDream);
    });

    it('should throw NotFoundException when content is empty', async () => {
      // Hata senaryoları da test edilir
      const dto = {
        content: '',
        category: DreamCategory.NORMAL,
        visibility: DreamVisibility.PRIVATE,
      };
      await expect(service.create('user-id', dto)).rejects.toThrow();
    });
  });
});
```

### Test Coverage Hedefleri

| Servis           | Hedef Coverage |
| ---------------- | -------------- |
| `auth.service`   | %90+ (kritik)  |
| `dreams.service` | %85+           |
| `users.service`  | %80+           |
| `feed.service`   | %75+           |
| `social.service` | %75+           |
| Diğer servisler  | %70+           |

---

_Bu doküman CODING_STANDARDS.md olup tüm kod değişikliklerinde referans alınır._  
_ESLint + Prettier + mypy otomatik olarak uygular — elle düzeltme gerektirmez._
