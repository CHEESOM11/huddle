import {
  Controller,
  Get,
  Headers,
  Query,
} from '@nestjs/common';

import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
  ) {}

  @Get()
  async searchMessages(
    @Query('q') query: string,
    @Headers('authorization') authorization: string,
  ) {
    const accessToken =
      authorization?.replace(
        /^Bearer\s+/i,
        '',
      );

    return this.searchService.searchMessages(
      query,
      accessToken,
    );
  }
}